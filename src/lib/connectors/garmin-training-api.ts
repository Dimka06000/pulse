/**
 * Garmin Training API — Push structured workouts to Garmin Connect.
 * Docs: https://developer.garmin.com/gc-developer-program/training-api/
 *
 * Once pushed, workouts appear in the user's Garmin Connect calendar
 * and auto-sync to their compatible Garmin watch.
 */

import type { GarminWorkout, GarminWorkoutStep } from './garmin-push';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const GARMIN_TRAINING_API = 'https://apis.garmin.com/training-api/rest';

// Sport type mapping to Garmin's sport codes
const GARMIN_SPORT_TYPE: Record<string, { sportType: { sportTypeId: number; sportTypeKey: string } }> = {
  running: { sportType: { sportTypeId: 1, sportTypeKey: 'running' } },
  cyclisme: { sportType: { sportTypeId: 2, sportTypeKey: 'cycling' } },
  natation: { sportType: { sportTypeId: 5, sportTypeKey: 'swimming' } },
  musculation: { sportType: { sportTypeId: 4, sportTypeKey: 'strength_training' } },
  fitness: { sportType: { sportTypeId: 10, sportTypeKey: 'fitness_equipment' } },
  yoga: { sportType: { sportTypeId: 9, sportTypeKey: 'yoga' } },
  trail: { sportType: { sportTypeId: 3, sportTypeKey: 'hiking' } },
  crossfit: { sportType: { sportTypeId: 4, sportTypeKey: 'strength_training' } },
  boxe: { sportType: { sportTypeId: 10, sportTypeKey: 'fitness_equipment' } },
};

// Step type mapping
const STEP_TYPE_MAP: Record<string, { stepTypeId: number; stepTypeKey: string }> = {
  warmup: { stepTypeId: 1, stepTypeKey: 'warmup' },
  active: { stepTypeId: 3, stepTypeKey: 'interval' },
  rest: { stepTypeId: 4, stepTypeKey: 'rest' },
  cooldown: { stepTypeId: 2, stepTypeKey: 'cooldown' },
  repeat: { stepTypeId: 6, stepTypeKey: 'repeat' },
};

// Duration type mapping
const DURATION_TYPE_MAP: Record<string, { durationType: string; durationValueType: string }> = {
  time: { durationType: 'time', durationValueType: 'time_seconds' },
  distance: { durationType: 'distance', durationValueType: 'distance_meters' },
};

function convertDurationToSeconds(value: number, unit: string): number {
  switch (unit) {
    case 'minutes': return value * 60;
    case 'hours': return value * 3600;
    case 'seconds': return value;
    default: return value;
  }
}

function convertStep(step: GarminWorkoutStep, order: number): Record<string, unknown> {
  const garminStep: Record<string, unknown> = {
    stepOrder: order,
    stepType: STEP_TYPE_MAP[step.type] || STEP_TYPE_MAP.active,
  };

  if (step.description) {
    garminStep.description = step.description;
  }

  if (step.duration) {
    const dMapping = DURATION_TYPE_MAP[step.duration.type] || DURATION_TYPE_MAP.time;
    garminStep.endCondition = { conditionTypeKey: dMapping.durationType };
    if (step.duration.type === 'time') {
      garminStep.endConditionValue = convertDurationToSeconds(step.duration.value, step.duration.unit);
    } else {
      garminStep.endConditionValue = step.duration.value;
    }
  }

  if (step.target) {
    garminStep.targetType = { workoutTargetTypeKey: step.target.type === 'heart_rate' ? 'heart.rate.zone' : 'no.target' };
    if (step.target.low != null) garminStep.targetValueLow = step.target.low;
    if (step.target.high != null) garminStep.targetValueHigh = step.target.high;
  }

  // Repeat steps
  if (step.type === 'repeat' && step.steps) {
    garminStep.numberOfIterations = step.repeatCount || 1;
    garminStep.workoutSteps = step.steps.map((s, i) => convertStep(s, i + 1));
  }

  return garminStep;
}

/**
 * Convert a Pulse GarminWorkout to Garmin Training API format and push it.
 */
function convertToGarminFormat(workout: GarminWorkout, scheduledDate?: string) {
  const sportInfo = GARMIN_SPORT_TYPE[workout.sport] || GARMIN_SPORT_TYPE.fitness;

  const garminWorkout: Record<string, unknown> = {
    workoutName: workout.workoutName,
    ...sportInfo,
    workoutSteps: workout.steps.map((step, i) => convertStep(step, i + 1)),
  };

  if (scheduledDate) {
    garminWorkout.scheduledDate = scheduledDate; // YYYY-MM-DD
  }

  return garminWorkout;
}

/**
 * Get valid Garmin access token for a user, refreshing if needed.
 */
async function getGarminToken(userId: string): Promise<string | null> {
  const admin = getSupabaseAdminClient();
  const { data: conn } = await admin
    .from('fitness_connections')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .eq('provider', 'garmin')
    .eq('is_active', true)
    .single();

  if (!conn) return null;

  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
  if (expiresAt && expiresAt < new Date() && conn.refresh_token) {
    // Refresh token
    const { refreshGarminToken } = await import('./garmin');
    try {
      const newTokens = await refreshGarminToken(conn.refresh_token);
      await admin.from('fitness_connections').update({
        access_token: newTokens.accessToken,
        refresh_token: newTokens.refreshToken,
        token_expires_at: new Date(Date.now() + newTokens.expiresIn * 1000).toISOString(),
      }).eq('user_id', userId).eq('provider', 'garmin');
      return newTokens.accessToken;
    } catch {
      return null;
    }
  }

  return conn.access_token;
}

/**
 * Push a structured workout to a user's Garmin Connect account.
 * The workout will appear in their calendar and sync to their watch.
 */
export async function pushWorkoutToGarmin(
  userId: string,
  workout: GarminWorkout,
  scheduledDate?: string,
): Promise<{ success: boolean; error?: string; workoutId?: string }> {
  const token = await getGarminToken(userId);
  if (!token) {
    return { success: false, error: 'Garmin non connecté' };
  }

  const garminPayload = convertToGarminFormat(workout, scheduledDate);

  const res = await fetch(`${GARMIN_TRAINING_API}/workouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(garminPayload),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown error');
    return { success: false, error: `Garmin API error ${res.status}: ${err}` };
  }

  const data = await res.json();
  return { success: true, workoutId: data.workoutId || data.id };
}

/**
 * Push a full program (multiple workouts) to Garmin Connect calendar.
 */
export async function pushProgramToGarmin(
  userId: string,
  workouts: Array<{ workout: GarminWorkout; scheduledDate: string }>,
): Promise<{ success: boolean; pushed: number; errors: string[] }> {
  const errors: string[] = [];
  let pushed = 0;

  for (const { workout, scheduledDate } of workouts) {
    const result = await pushWorkoutToGarmin(userId, workout, scheduledDate);
    if (result.success) {
      pushed++;
    } else {
      errors.push(`${workout.workoutName}: ${result.error}`);
    }
  }

  return { success: errors.length === 0, pushed, errors };
}

// Apple Health workout push is done client-side via HealthKit JS
// This module formats workout data for the client to push

export interface AppleHealthWorkout {
  activityType: string;
  duration: number; // seconds
  startDate: string; // ISO
  energyBurned?: number; // kcal
  metadata?: Record<string, string>;
}

const SPORT_TO_APPLE: Record<string, string> = {
  crossfit: 'crossTraining',
  yoga: 'yoga',
  running: 'running',
  trail: 'hiking',
  boxe: 'boxing',
  musculation: 'traditionalStrengthTraining',
  fitness: 'functionalStrengthTraining',
  pilates: 'pilates',
  meditation: 'mindAndBody',
  natation: 'swimming',
  cyclisme: 'cycling',
};

export function formatWorkoutForApple(
  sport: string,
  durationMinutes: number,
  startDate: string,
  calories?: number,
): AppleHealthWorkout {
  return {
    activityType: SPORT_TO_APPLE[sport] || 'other',
    duration: durationMinutes * 60,
    startDate,
    energyBurned: calories,
  };
}

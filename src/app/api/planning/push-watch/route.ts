import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatWorkoutForGarmin } from '@/lib/connectors/garmin-push';
import { pushProgramToGarmin } from '@/lib/connectors/garmin-training-api';

/* eslint-disable @typescript-eslint/no-explicit-any */

// POST /api/planning/push-watch — push upcoming solo sessions to Garmin watch
export async function POST() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const admin = getSupabaseAdminClient();

  // Check Garmin connection
  const { data: garminConn } = await admin
    .from('fitness_connections')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'garmin')
    .eq('is_active', true)
    .maybeSingle();

  if (!garminConn) {
    return NextResponse.json({
      error: 'Connectez votre Garmin dans Profil > Connexions',
    }, { status: 400 });
  }

  // Get upcoming solo sessions (not completed, not in the past)
  const now = new Date().toISOString();
  const { data: sessions } = await admin
    .from('solo_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('completed', false)
    .gte('scheduled_at', now)
    .order('scheduled_at', { ascending: true });

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ error: 'Aucune séance à venir' }, { status: 400 });
  }

  // Convert each session to Garmin workout
  const garminWorkouts = sessions.map((s: any) => {
    const exercises = s.metrics?.exercises || [];
    const workoutData = { exercises };

    const garminWorkout = formatWorkoutForGarmin(
      s.title || 'Séance Pulse',
      s.sport || 'fitness',
      workoutData,
    );

    // If no exercises, add a simple timed block
    if (exercises.length === 0) {
      garminWorkout.steps = [
        {
          type: 'warmup' as const,
          duration: { type: 'time' as const, value: 5, unit: 'minutes' },
          description: 'Échauffement',
        },
        {
          type: 'active' as const,
          duration: { type: 'time' as const, value: Math.max(s.duration_minutes - 10, 10), unit: 'minutes' },
          description: s.title || s.sport || 'Entraînement',
        },
        {
          type: 'cooldown' as const,
          duration: { type: 'time' as const, value: 5, unit: 'minutes' },
          description: 'Retour au calme',
        },
      ];
    }

    const scheduledDate = new Date(s.scheduled_at).toISOString().split('T')[0];
    return { workout: garminWorkout, scheduledDate };
  });

  const result = await pushProgramToGarmin(user.id, garminWorkouts);

  return NextResponse.json({
    message: `${result.pushed} séance${result.pushed > 1 ? 's' : ''} envoyée${result.pushed > 1 ? 's' : ''} sur votre Garmin`,
    pushed: result.pushed,
    total: sessions.length,
    errors: result.errors,
  }, { status: result.pushed > 0 ? 200 : 500 });
}

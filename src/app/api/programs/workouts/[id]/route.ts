import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const { id } = await ctx.params;
  const db = getSupabaseAdminClient();

  try {
    const { data: workout, error } = await db
      .from('program_workouts')
      .select('*, training_programs(title)')
      .eq('id', id)
      .single();

    if (error || !workout) {
      return NextResponse.json({ error: 'Seance introuvable' }, { status: 404 });
    }

    const raw = workout.workout_data;
    const workoutData = typeof raw === 'string' ? JSON.parse(raw) : (raw || { exercises: [] });
    const exercises = workoutData.exercises || [];

    // Estimate total duration from exercises
    let totalDuration = 0;
    for (const ex of exercises) {
      const setTime = ex.duration_minutes
        ? ex.duration_minutes
        : (ex.reps || 10) * 3 / 60; // ~3s per rep estimate
      const restTime = (ex.rest_seconds || 60) / 60;
      totalDuration += (setTime + restTime) * (ex.sets || 1);
    }

    return NextResponse.json({
      id: workout.id,
      title: workout.title || (workout.training_programs as any)?.title || 'Seance',
      exercises,
      totalDuration: Math.round(totalDuration),
      programTitle: (workout.training_programs as any)?.title || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

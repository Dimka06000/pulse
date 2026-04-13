import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { calculateLoadMetrics, DailyTSS } from '@/lib/training/load-metrics';
import { generateRecommendations } from '@/lib/training/recommendations';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  try {
    // Verify coach owns the program
    const { data: program } = await supabase
      .from('training_programs')
      .select('id, coach_profiles(user_id)')
      .eq('id', id)
      .single();

    if (!program) {
      return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 });
    }

    const coachProfile = program.coach_profiles as unknown as { user_id: string } | null;
    if (coachProfile?.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Fetch all workouts ordered by week then day
    const { data: workouts, error } = await supabase
      .from('program_workouts')
      .select('week_number, day_number, workout_data')
      .eq('program_id', id)
      .order('week_number')
      .order('day_number');

    if (error) throw error;

    // Build DailyTSS array — project dates from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyTSS: DailyTSS[] = (workouts ?? []).map((w) => {
      const weekNum: number = w.week_number ?? 1;
      const dayNum: number = w.day_number ?? 1;
      const offsetDays = (weekNum - 1) * 7 + (dayNum - 1);
      const date = new Date(today);
      date.setDate(date.getDate() + offsetDays);
      const dateStr = date.toISOString().slice(0, 10);

      // Estimate TSS: exercises_count * 15 * (intensity_percent / 100)
      const workoutData = (w.workout_data ?? {}) as Record<string, unknown>;
      const exercisesCount = Array.isArray(workoutData.exercises)
        ? (workoutData.exercises as unknown[]).length
        : typeof workoutData.exercises_count === 'number'
          ? workoutData.exercises_count
          : 0;
      const intensityPercent =
        typeof workoutData.intensity_percent === 'number'
          ? workoutData.intensity_percent
          : 70; // default 70%

      const tss = exercisesCount * 15 * (intensityPercent / 100);

      return { date: dateStr, tss };
    });

    const { ctl, atl, tsb, history } = calculateLoadMetrics(dailyTSS);

    const recommendations = generateRecommendations({ ctl, atl, tsb });

    return NextResponse.json({
      history,
      recommendations,
      currentMetrics: { ctl, atl, tsb },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

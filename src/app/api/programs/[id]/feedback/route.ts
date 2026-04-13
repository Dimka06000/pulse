import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { analyzeWeekFeedback, type PlannedVsActual } from '@/lib/training/feedback-analyzer';
import { calculateLoadMetrics, type DailyTSS } from '@/lib/training/load-metrics';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
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
      .select('id, sport, level, duration_weeks, athlete_id, coach_profiles(user_id)')
      .eq('id', id)
      .single();

    if (!program) {
      return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 });
    }

    const coachProfile = program.coach_profiles as unknown as { user_id: string } | null;
    if (coachProfile?.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await req.json();
    const weekNumber = body.weekNumber as number;
    if (!weekNumber || weekNumber < 1) {
      return NextResponse.json({ error: 'weekNumber requis (>= 1)' }, { status: 400 });
    }

    // 1. Fetch planned workouts for this week
    const { data: workouts } = await supabase
      .from('program_workouts')
      .select('*')
      .eq('program_id', id)
      .eq('week_number', weekNumber)
      .order('day_number');

    const planned: PlannedVsActual['planned'] = (workouts ?? []).map((w) => {
      const wd = (w.workout_data ?? {}) as Record<string, unknown>;
      const exercises = Array.isArray(wd.exercises)
        ? (wd.exercises as Array<Record<string, unknown>>).map((e) => String(e.name || ''))
        : [];
      const intensityPercent = typeof wd.intensity_percent === 'number' ? wd.intensity_percent : 70;
      return {
        title: w.title ?? '',
        durationMinutes: w.duration_minutes ?? 60,
        intensityPercent,
        exercises,
      };
    });

    // 2. Fetch actual sessions for that week
    let actual: PlannedVsActual['actual'] = [];
    const athleteId = program.athlete_id as string | null;

    if (athleteId) {
      // Calculate date range for the week based on program start
      // We use program creation or a fixed reference — here we compute from today - offset
      const { data: programFull } = await supabase
        .from('training_programs')
        .select('created_at')
        .eq('id', id)
        .single();

      const programStart = new Date(programFull?.created_at ?? new Date());
      programStart.setHours(0, 0, 0, 0);

      const weekStartDate = new Date(programStart);
      weekStartDate.setDate(weekStartDate.getDate() + (weekNumber - 1) * 7);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);

      const startStr = weekStartDate.toISOString().slice(0, 10);
      const endStr = weekEndDate.toISOString().slice(0, 10);

      // Solo sessions
      const { data: soloSessions } = await supabase
        .from('solo_sessions')
        .select('title, duration_minutes, sport, tss, rpe')
        .eq('user_id', athleteId)
        .gte('date', startStr)
        .lte('date', endStr);

      if (soloSessions?.length) {
        actual = soloSessions.map((s) => ({
          title: s.title ?? 'Session',
          durationMinutes: s.duration_minutes ?? 0,
          sport: s.sport ?? '',
          tss: s.tss ?? undefined,
          rpe: s.rpe ?? undefined,
        }));
      }

      // Also check synced activities from fitness_connections
      const { data: syncedActivities } = await supabase
        .from('fitness_activities')
        .select('name, duration_seconds, sport_type, tss')
        .eq('user_id', athleteId)
        .gte('start_date', startStr)
        .lte('start_date', endStr);

      if (syncedActivities?.length) {
        const synced = syncedActivities.map((a) => ({
          title: a.name ?? 'Activité synchronisée',
          durationMinutes: Math.round((a.duration_seconds ?? 0) / 60),
          sport: a.sport_type ?? '',
          tss: a.tss ?? undefined,
          rpe: undefined,
        }));
        actual = [...actual, ...synced];
      }
    }

    // 3. Compute current load metrics
    const { data: allWorkouts } = await supabase
      .from('program_workouts')
      .select('week_number, day_number, workout_data')
      .eq('program_id', id)
      .order('week_number')
      .order('day_number');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyTSS: DailyTSS[] = (allWorkouts ?? []).map((w) => {
      const weekNum: number = w.week_number ?? 1;
      const dayNum: number = w.day_number ?? 1;
      const offsetDays = (weekNum - 1) * 7 + (dayNum - 1);
      const date = new Date(today);
      date.setDate(date.getDate() + offsetDays);
      const dateStr = date.toISOString().slice(0, 10);

      const workoutData = (w.workout_data ?? {}) as Record<string, unknown>;
      const exercisesCount = Array.isArray(workoutData.exercises)
        ? (workoutData.exercises as unknown[]).length
        : 0;
      const intensityPercent =
        typeof workoutData.intensity_percent === 'number'
          ? workoutData.intensity_percent
          : 70;

      const tss = exercisesCount * 15 * (intensityPercent / 100);
      return { date: dateStr, tss };
    });

    const { ctl, atl, tsb } = calculateLoadMetrics(dailyTSS);

    // 4. Call AI analyzer
    const feedbackInput: PlannedVsActual = { weekNumber, planned, actual };
    const athleteLevel = (program.level as string) || 'intermediate';
    const result = await analyzeWeekFeedback(feedbackInput, { ctl, atl, tsb }, athleteLevel);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

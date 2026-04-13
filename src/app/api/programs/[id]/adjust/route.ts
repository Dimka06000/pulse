import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { calculateLoadMetrics, type DailyTSS } from '@/lib/training/load-metrics';
import { analyzeAndAdjust, type Adjustment } from '@/lib/training/program-adjuster';

type Ctx = { params: Promise<{ id: string }> };

// ── POST: Analyze planned vs actual, return AI adjustments ──

export async function POST(_req: NextRequest, ctx: Ctx) {
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
      .select('id, sport, duration_weeks, coach_profiles(user_id)')
      .eq('id', id)
      .single();

    if (!program) {
      return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 });
    }

    const coachProfile = program.coach_profiles as unknown as { user_id: string } | null;
    if (coachProfile?.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Fetch all program workouts
    const { data: workouts } = await supabase
      .from('program_workouts')
      .select('id, week_number, day_number, title, duration_minutes, workout_data')
      .eq('program_id', id)
      .order('week_number')
      .order('day_number');

    // Fetch athlete's recent solo_sessions (last 14 days)
    // Find enrolled athlete(s) for this program
    const { data: enrollments } = await supabase
      .from('program_enrollments')
      .select('athlete_id')
      .eq('program_id', id)
      .limit(1);

    const athleteId = enrollments?.[0]?.athlete_id;

    let completedSessions: { date: string; sport: string; durationMinutes: number; rpe?: number; notes?: string }[] = [];

    if (athleteId) {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: sessions } = await supabase
        .from('solo_sessions')
        .select('scheduled_at, sport, duration_minutes, notes, metrics')
        .eq('user_id', athleteId)
        .eq('completed', true)
        .gte('scheduled_at', fourteenDaysAgo.toISOString())
        .order('scheduled_at', { ascending: true });

      completedSessions = (sessions ?? []).map((s) => {
        const metrics = (s.metrics ?? {}) as Record<string, unknown>;
        return {
          date: new Date(s.scheduled_at).toISOString().slice(0, 10),
          sport: s.sport,
          durationMinutes: s.duration_minutes,
          rpe: typeof metrics.rpe === 'number' ? metrics.rpe : undefined,
          notes: s.notes || undefined,
        };
      });
    }

    // Calculate current load metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyTSS: DailyTSS[] = (workouts ?? []).map((w) => {
      const offsetDays = ((w.week_number ?? 1) - 1) * 7 + ((w.day_number ?? 1) - 1);
      const date = new Date(today);
      date.setDate(date.getDate() + offsetDays);
      const workoutData = (w.workout_data ?? {}) as Record<string, unknown>;
      const exercisesCount = Array.isArray(workoutData.exercises)
        ? (workoutData.exercises as unknown[]).length
        : 0;
      const intensityPercent =
        typeof workoutData.intensity_percent === 'number'
          ? workoutData.intensity_percent
          : 70;
      return {
        date: date.toISOString().slice(0, 10),
        tss: exercisesCount * 15 * (intensityPercent / 100),
      };
    });

    const { ctl, atl, tsb } = calculateLoadMetrics(dailyTSS);

    // Determine current week (rough estimate from program start)
    const currentWeek = Math.max(1, Math.ceil((Date.now() - today.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1);

    // Prepare planned workouts
    const plannedWorkouts = (workouts ?? []).map((w) => {
      const workoutData = (w.workout_data ?? {}) as Record<string, unknown>;
      return {
        weekNumber: w.week_number ?? 1,
        dayNumber: w.day_number ?? 1,
        title: w.title ?? '',
        durationMinutes: w.duration_minutes ?? 60,
        intensityPercent:
          typeof workoutData.intensity_percent === 'number'
            ? workoutData.intensity_percent
            : 70,
      };
    });

    const adjustments = await analyzeAndAdjust({
      programId: id,
      sport: program.sport ?? '',
      plannedWorkouts,
      completedSessions,
      currentMetrics: { ctl, atl, tsb },
      currentWeek,
    });

    return NextResponse.json({ adjustments });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── PATCH: Apply accepted adjustments ──

export async function PATCH(req: NextRequest, ctx: Ctx) {
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

    const body = await req.json();
    const adjustments: Adjustment[] = body.adjustments ?? [];

    if (!adjustments.length) {
      return NextResponse.json({ error: 'Aucun ajustement fourni' }, { status: 400 });
    }

    const results: { type: string; success: boolean; weekNumber: number; dayNumber: number }[] = [];

    for (const adj of adjustments) {
      try {
        switch (adj.type) {
          case 'modify': {
            // Find the existing workout for this week/day
            const { data: existing } = await supabase
              .from('program_workouts')
              .select('id, workout_data')
              .eq('program_id', id)
              .eq('week_number', adj.weekNumber)
              .eq('day_number', adj.dayNumber)
              .limit(1)
              .single();

            if (existing && adj.changes) {
              const updates: Record<string, unknown> = {};
              if (adj.changes.title) updates.title = adj.changes.title;
              if (adj.changes.durationMinutes) updates.duration_minutes = adj.changes.durationMinutes;
              if (adj.changes.intensityPercent) {
                const existingData = (existing.workout_data ?? {}) as Record<string, unknown>;
                updates.workout_data = { ...existingData, intensity_percent: adj.changes.intensityPercent };
              }

              await supabase
                .from('program_workouts')
                .update(updates)
                .eq('id', existing.id);
            }
            results.push({ type: 'modify', success: true, weekNumber: adj.weekNumber, dayNumber: adj.dayNumber });
            break;
          }
          case 'add': {
            if (adj.changes) {
              await supabase.from('program_workouts').insert({
                program_id: id,
                week_number: adj.weekNumber,
                day_number: adj.dayNumber,
                title: adj.changes.title || 'Séance ajoutée',
                duration_minutes: adj.changes.durationMinutes || 60,
                workout_data: {
                  exercises: [],
                  intensity_percent: adj.changes.intensityPercent || 70,
                },
                description: adj.reason,
              });
            }
            results.push({ type: 'add', success: true, weekNumber: adj.weekNumber, dayNumber: adj.dayNumber });
            break;
          }
          case 'remove': {
            await supabase
              .from('program_workouts')
              .delete()
              .eq('program_id', id)
              .eq('week_number', adj.weekNumber)
              .eq('day_number', adj.dayNumber);

            results.push({ type: 'remove', success: true, weekNumber: adj.weekNumber, dayNumber: adj.dayNumber });
            break;
          }
          case 'alert': {
            // Alerts are informational — just pass through
            results.push({ type: 'alert', success: true, weekNumber: adj.weekNumber, dayNumber: adj.dayNumber });
            break;
          }
        }
      } catch {
        results.push({ type: adj.type, success: false, weekNumber: adj.weekNumber, dayNumber: adj.dayNumber });
      }
    }

    return NextResponse.json({ results, applied: results.filter((r) => r.success).length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

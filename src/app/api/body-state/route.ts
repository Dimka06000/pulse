import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { calculateLoadMetrics, DailyTSS } from '@/lib/training/load-metrics';
import { computeBodyState } from '@/lib/training/body-state-engine';
import { SPORT_TO_DISCIPLINE } from '@/lib/training/exercises';
import type { Sport } from '@/lib/sports';
import type { Discipline } from '@/lib/training/types';

export async function GET() {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const since = fourteenDaysAgo.toISOString();

  try {
    // Fetch recent activities from all sources
    const [soloRes, syncRes, bookingRes] = await Promise.all([
      supabase
        .from('solo_sessions')
        .select('sport, duration_minutes, scheduled_at, rpe, tss')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('scheduled_at', since),
      supabase
        .from('synced_activities')
        .select('sport_type, duration_seconds, start_date, suffer_score, tss, average_heartrate')
        .eq('user_id', user.id)
        .gte('start_date', since),
      supabase
        .from('bookings')
        .select('sport, duration_minutes, booking_date, rpe')
        .eq('athlete_id', user.id)
        .eq('status', 'completed')
        .gte('booking_date', since),
    ]);

    // Build unified activity list
    interface UnifiedActivity {
      discipline: Discipline;
      tss: number;
      date: string;
      duration: number;
      rpe?: number;
    }

    const activities: UnifiedActivity[] = [];

    // Solo sessions
    for (const s of soloRes.data ?? []) {
      const disc = SPORT_TO_DISCIPLINE[s.sport as Sport] || 'other';
      const duration = s.duration_minutes || 30;
      const tss = s.tss || duration * ((s.rpe || 5) / 5);
      activities.push({
        discipline: disc,
        tss,
        date: s.scheduled_at,
        duration,
        rpe: s.rpe ?? undefined,
      });
    }

    // Synced activities (Strava etc)
    for (const a of syncRes.data ?? []) {
      // Map Strava sport_type to our discipline
      const sportMap: Record<string, Discipline> = {
        Run: 'run', Ride: 'bike', Swim: 'swim', WeightTraining: 'strength',
        Workout: 'strength', Yoga: 'other', Walk: 'other', Hike: 'run',
        TrailRun: 'run', VirtualRide: 'bike', VirtualRun: 'run',
      };
      const disc = sportMap[a.sport_type] || 'other';
      const duration = Math.round((a.duration_seconds || 0) / 60);
      const tss = a.tss || (a.suffer_score ? a.suffer_score * 2 : duration * 0.8);
      activities.push({
        discipline: disc,
        tss,
        date: a.start_date,
        duration,
      });
    }

    // Bookings (coach sessions)
    for (const b of bookingRes.data ?? []) {
      const disc = SPORT_TO_DISCIPLINE[b.sport as Sport] || 'other';
      const duration = b.duration_minutes || 60;
      const tss = duration * ((b.rpe || 6) / 5);
      activities.push({
        discipline: disc,
        tss,
        date: b.booking_date,
        duration,
        rpe: b.rpe ?? undefined,
      });
    }

    // Build daily TSS for load metrics
    const dailyMap = new Map<string, number>();
    for (const act of activities) {
      const dateKey = new Date(act.date).toISOString().slice(0, 10);
      dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + act.tss);
    }

    const dailyTSS: DailyTSS[] = Array.from(dailyMap.entries())
      .map(([date, tss]) => ({ date, tss }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const { ctl, atl, tsb } = calculateLoadMetrics(dailyTSS);

    const bodyState = computeBodyState({
      activities,
      currentMetrics: { ctl, atl, tsb },
    });

    return NextResponse.json(bodyState);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  calibrateFromActivities,
  type CalibrationActivity,
} from '@/lib/training/calibration';

type Ctx = { params: Promise<{ id: string }> };

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id: athleteId } = await ctx.params;

  // Auth
  const authClient = await getSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const db = getSupabaseAdminClient();

  // Authorization: user is the athlete OR a coach who has a booking/chat with this athlete
  const isSelf = user.id === athleteId;
  if (!isSelf) {
    const { data: coachProfile } = await db
      .from('coach_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!coachProfile) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Check coach has at least one booking with this athlete
    const { count } = await db
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', coachProfile.id)
      .eq('athlete_id', athleteId);

    if (!count || count === 0) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }
  }

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 84); // 12 weeks
    const cutoffISO = cutoff.toISOString();

    // Fetch synced activities
    const { data: synced } = await db
      .from('synced_activities')
      .select('sport, duration_seconds, start_time, avg_heart_rate')
      .eq('user_id', athleteId)
      .gte('start_time', cutoffISO)
      .order('start_time', { ascending: false });

    // Fetch solo sessions (completed only)
    const { data: solo } = await db
      .from('solo_sessions')
      .select('sport, duration_minutes, scheduled_at, metrics')
      .eq('user_id', athleteId)
      .eq('completed', true)
      .gte('scheduled_at', cutoffISO)
      .order('scheduled_at', { ascending: false });

    // Fetch completed bookings
    const { data: bookings } = await db
      .from('bookings')
      .select('scheduled_at, status, session_templates(sport, duration)')
      .eq('athlete_id', athleteId)
      .eq('status', 'completed')
      .gte('scheduled_at', cutoffISO)
      .order('scheduled_at', { ascending: false });

    // Merge into CalibrationActivity[]
    const activities: CalibrationActivity[] = [
      ...(synced || []).map((a: any) => ({
        date: new Date(a.start_time).toISOString().slice(0, 10),
        duration: Math.round(a.duration_seconds / 60),
        sport: a.sport,
        avgHR: a.avg_heart_rate ?? undefined,
      })),
      ...(solo || []).map((s: any) => ({
        date: new Date(s.scheduled_at).toISOString().slice(0, 10),
        duration: s.duration_minutes,
        sport: s.sport,
        rpe: (s.metrics as any)?.rpe ?? undefined,
      })),
      ...(bookings || []).map((b: any) => ({
        date: new Date(b.scheduled_at).toISOString().slice(0, 10),
        duration: b.session_templates?.duration ?? 60,
        sport: b.session_templates?.sport ?? 'fitness',
      })),
    ];

    const calibration = calibrateFromActivities(activities);

    return NextResponse.json(calibration);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

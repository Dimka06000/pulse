import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function GET(req: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const limit = Number(req.nextUrl.searchParams.get('limit') || '30');
  const db = getSupabaseAdminClient();

  // Synced activities
  const { data: synced } = await db
    .from('synced_activities')
    .select('id, provider, sport, title, duration_seconds, distance_meters, calories, start_time, avg_heart_rate, elevation_gain, average_speed')
    .eq('user_id', user.id)
    .order('start_time', { ascending: false })
    .limit(limit);

  // Completed bookings
  const { data: bookings } = await db
    .from('bookings')
    .select('id, scheduled_at, status, session_templates(title, sport, duration)')
    .eq('athlete_id', user.id)
    .eq('status', 'completed')
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  // Merge and sort
  const activities = [
    ...(synced || []).map((a: any) => ({
      id: a.id,
      source: a.provider,
      sport: a.sport,
      title: a.title,
      durationMinutes: Math.round(a.duration_seconds / 60),
      distanceKm: a.distance_meters ? +(a.distance_meters / 1000).toFixed(1) : null,
      calories: a.calories,
      startTime: a.start_time,
      avgHeartRate: a.avg_heart_rate,
      elevationGain: a.elevation_gain ? +Number(a.elevation_gain).toFixed(0) : null,
      averageSpeedKmh: a.average_speed ? +(a.average_speed * 3.6).toFixed(1) : null,
    })),
    ...(bookings || []).map((b: any) => ({
      id: b.id,
      source: 'pulse',
      sport: b.session_templates?.sport || 'fitness',
      title: b.session_templates?.title || 'Seance',
      durationMinutes: b.session_templates?.duration || 60,
      distanceKm: null,
      calories: null,
      startTime: b.scheduled_at,
      avgHeartRate: null,
      elevationGain: null,
      averageSpeedKmh: null,
    })),
  ].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
   .slice(0, limit);

  return NextResponse.json({ activities });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

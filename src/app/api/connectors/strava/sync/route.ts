import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { fetchStravaActivities, refreshStravaToken } from '@/lib/connectors/strava';

export async function POST() {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const db = getSupabaseAdminClient();
  const { data: connection } = await db
    .from('fitness_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'strava')
    .eq('is_active', true)
    .single();

  if (!connection) return NextResponse.json({ error: 'Strava non connecte' }, { status: 404 });

  try {
    // Refresh token if needed
    let accessToken = connection.access_token;
    const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    if (expiresAt && expiresAt <= new Date() && connection.refresh_token) {
      const refreshed = await refreshStravaToken(connection.refresh_token);
      accessToken = refreshed.accessToken;
      await db.from('fitness_connections').update({
        access_token: refreshed.accessToken,
        refresh_token: refreshed.refreshToken,
        token_expires_at: new Date(refreshed.expiresAt * 1000).toISOString(),
      }).eq('id', connection.id);
    }

    // Fetch activities since last sync
    const afterTs = connection.last_sync_at
      ? Math.floor(new Date(connection.last_sync_at).getTime() / 1000)
      : undefined;
    const activities = await fetchStravaActivities(accessToken, afterTs);

    if (activities.length > 0) {
      const rows = activities.map(a => ({
        user_id: user.id,
        provider: 'strava',
        provider_activity_id: a.providerActivityId,
        sport: a.sport,
        title: a.title,
        duration_seconds: a.durationSeconds,
        distance_meters: a.distanceMeters,
        calories: a.calories,
        start_time: a.startTime,
        avg_heart_rate: a.avgHeartRate,
        max_heart_rate: a.maxHeartRate,
        elevation_gain: a.elevationGain,
        average_speed: a.averageSpeed,
      }));
      await db.from('synced_activities').upsert(rows, { onConflict: 'provider,provider_activity_id' });
    }

    await db.from('fitness_connections').update({ last_sync_at: new Date().toISOString() }).eq('id', connection.id);

    return NextResponse.json({ synced: activities.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Strava sync error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

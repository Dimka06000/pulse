import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { refreshStravaToken } from '@/lib/connectors/strava';

const STRAVA_VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || 'pulse-strava-webhook-2026';

// ---------------------------------------------------------------------------
// GET — Strava webhook validation (subscription setup)
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === STRAVA_VERIFY_TOKEN && challenge) {
    console.log('[Strava Webhook] Validation OK');
    return NextResponse.json({ 'hub.challenge': challenge });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ---------------------------------------------------------------------------
// POST — Strava event notification
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { object_type, object_id, aspect_type, owner_id } = body;

  console.log(`[Strava Webhook] ${aspect_type} ${object_type} ${object_id} for athlete ${owner_id}`);

  // Only process activity creates and updates
  if (object_type !== 'activity' || !['create', 'update'].includes(aspect_type)) {
    return NextResponse.json({ ok: true });
  }

  // Fire-and-forget — Strava requires response within 2 seconds
  processStravaEvent(owner_id, object_id, aspect_type).catch((err) =>
    console.error('[Strava Webhook] Processing error:', err),
  );

  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// Background processing
// ---------------------------------------------------------------------------

const STRAVA_SPORT_MAP: Record<string, string> = {
  Run: 'running',
  Ride: 'cyclisme',
  Swim: 'natation',
  Walk: 'fitness',
  Hike: 'trail',
  WeightTraining: 'musculation',
  CrossFit: 'crossfit',
  Yoga: 'yoga',
  Workout: 'fitness',
  Boxing: 'boxe',
  TrailRun: 'trail',
  VirtualRide: 'cyclisme',
  VirtualRun: 'running',
  Rowing: 'fitness',
  Elliptical: 'fitness',
  StairStepper: 'fitness',
};

async function processStravaEvent(
  stravaAthleteId: number,
  activityId: number,
  _aspectType: string,
) {
  const db = getSupabaseAdminClient();

  // 1. Find user by Strava athlete ID
  const { data: connection } = await db
    .from('fitness_connections')
    .select('*')
    .eq('provider', 'strava')
    .eq('provider_user_id', String(stravaAthleteId))
    .eq('is_active', true)
    .single();

  if (!connection) {
    console.log(`[Strava Webhook] No active connection for athlete ${stravaAthleteId}`);
    return;
  }

  // 2. Refresh token if expired
  let accessToken = connection.access_token;
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;

  if (expiresAt && expiresAt <= new Date() && connection.refresh_token) {
    try {
      const refreshed = await refreshStravaToken(connection.refresh_token);
      accessToken = refreshed.accessToken;

      await db
        .from('fitness_connections')
        .update({
          access_token: refreshed.accessToken,
          refresh_token: refreshed.refreshToken,
          token_expires_at: new Date(refreshed.expiresAt * 1000).toISOString(),
        })
        .eq('id', connection.id);
    } catch (err) {
      console.error('[Strava Webhook] Token refresh failed:', err);
      return;
    }
  }

  // 3. Fetch the specific activity from Strava API
  try {
    const res = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.error(`[Strava Webhook] Activity fetch failed: ${res.status}`);
      return;
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const activity: any = await res.json();

    const sport =
      STRAVA_SPORT_MAP[activity.sport_type] ||
      STRAVA_SPORT_MAP[activity.type] ||
      'fitness';

    // 4. Upsert into synced_activities
    await db.from('synced_activities').upsert(
      {
        user_id: connection.user_id,
        provider: 'strava',
        provider_activity_id: String(activity.id),
        sport,
        title: activity.name,
        duration_seconds: activity.moving_time || activity.elapsed_time,
        distance_meters: activity.distance || null,
        calories: activity.calories || null,
        start_time: activity.start_date,
        end_time: activity.start_date
          ? new Date(
              new Date(activity.start_date).getTime() +
                (activity.elapsed_time || 0) * 1000,
            ).toISOString()
          : null,
        avg_heart_rate: activity.average_heartrate || null,
        max_heart_rate: activity.max_heartrate || null,
        elevation_gain: activity.total_elevation_gain || null,
        average_speed: activity.average_speed || null,
        max_speed: activity.max_speed || null,
        raw_data: {
          type: activity.type,
          sport_type: activity.sport_type,
          description: activity.description,
          photos: activity.total_photo_count,
          kudos: activity.kudos_count,
          gear_id: activity.gear_id,
        },
      },
      { onConflict: 'provider,provider_activity_id' },
    );

    // 5. Update last_sync_at on the connection
    await db
      .from('fitness_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection.id);

    // 6. Auto-generate feed post
    try {
      const durationMin = Math.round((activity.moving_time || 0) / 60);
      const distanceKm = activity.distance
        ? ` · ${(activity.distance / 1000).toFixed(1)} km`
        : '';

      await db.from('feed_posts').insert({
        user_id: connection.user_id,
        activity_type: 'synced',
        activity_id: String(activity.id),
        sport,
        title: activity.name,
        description: `${durationMin} min${distanceKm}`,
        metrics: {
          duration_seconds: activity.moving_time,
          distance_meters: activity.distance,
          calories: activity.calories,
          avg_heart_rate: activity.average_heartrate,
          elevation_gain: activity.total_elevation_gain,
          source: 'strava',
        },
      });
    } catch {
      // Feed post is non-critical — don't block
    }

    // 7. Auto-update streak
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: streak } = await db
        .from('user_streaks')
        .select('*')
        .eq('user_id', connection.user_id)
        .single();

      if (streak) {
        const lastDate = streak.last_activity_date;
        const yesterday = new Date(Date.now() - 86_400_000)
          .toISOString()
          .split('T')[0];

        let newStreak = streak.current_streak;
        if (lastDate === yesterday) {
          newStreak = streak.current_streak + 1;
        } else if (lastDate !== today) {
          newStreak = 1;
        }

        await db
          .from('user_streaks')
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, streak.longest_streak),
            last_activity_date: today,
            total_activities: streak.total_activities + 1,
          })
          .eq('user_id', connection.user_id);
      } else {
        await db.from('user_streaks').insert({
          user_id: connection.user_id,
          current_streak: 1,
          longest_streak: 1,
          last_activity_date: today,
          total_activities: 1,
        });
      }
    } catch {
      // Streak update is non-critical
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    console.log(`[Strava Webhook] Synced activity: ${activity.name} (${sport})`);
  } catch (err) {
    console.error('[Strava Webhook] Error:', err);
  }
}

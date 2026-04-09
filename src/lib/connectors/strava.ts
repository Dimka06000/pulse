import type { ConnectorConfig, SyncedActivity } from './types';

const STRAVA_CONFIG: ConnectorConfig = {
  clientId: process.env.STRAVA_CLIENT_ID || '',
  clientSecret: process.env.STRAVA_CLIENT_SECRET || '',
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100'}/api/connectors/strava/callback`,
  authUrl: 'https://www.strava.com/oauth/authorize',
  tokenUrl: 'https://www.strava.com/oauth/token',
  scopes: ['read', 'activity:read_all'],
};

export function getStravaAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: STRAVA_CONFIG.clientId,
    redirect_uri: STRAVA_CONFIG.redirectUri,
    response_type: 'code',
    scope: STRAVA_CONFIG.scopes.join(','),
    state,
  });
  return `${STRAVA_CONFIG.authUrl}?${params}`;
}

export async function exchangeStravaCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  athlete: Record<string, unknown>;
}> {
  const res = await fetch(STRAVA_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CONFIG.clientId,
      client_secret: STRAVA_CONFIG.clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athlete: data.athlete,
  };
}

export async function refreshStravaToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}> {
  const res = await fetch(STRAVA_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CONFIG.clientId,
      client_secret: STRAVA_CONFIG.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('Strava token refresh failed');
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  };
}

async function getValidToken(connection: {
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
}): Promise<string> {
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
  if (expiresAt && expiresAt > new Date()) return connection.access_token;
  if (!connection.refresh_token) throw new Error('No refresh token');
  const { accessToken } = await refreshStravaToken(connection.refresh_token);
  return accessToken;
}

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
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchStravaActivities(
  accessToken: string,
  after?: number,
  perPage = 30,
): Promise<SyncedActivity[]> {
  const params = new URLSearchParams({ per_page: String(perPage) });
  if (after) params.set('after', String(after));

  const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Strava activities fetch failed: ${res.status}`);
  const activities = await res.json();

  return activities.map((a: any) => ({
    id: '',
    provider: 'strava' as const,
    providerActivityId: String(a.id),
    sport: STRAVA_SPORT_MAP[a.sport_type] || STRAVA_SPORT_MAP[a.type] || 'fitness',
    title: a.name,
    durationSeconds: a.moving_time || a.elapsed_time,
    distanceMeters: a.distance || null,
    calories: a.calories || null,
    startTime: a.start_date,
    avgHeartRate: a.average_heartrate || null,
    maxHeartRate: a.max_heartrate || null,
    elevationGain: a.total_elevation_gain || null,
    averageSpeed: a.average_speed || null,
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export { getValidToken, STRAVA_CONFIG };

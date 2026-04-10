import type { ConnectorConfig, SyncedActivity } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100';

const GARMIN_CONFIG: ConnectorConfig = {
  clientId: process.env.GARMIN_CLIENT_ID || '',
  clientSecret: process.env.GARMIN_CLIENT_SECRET || '',
  redirectUri: `${BASE_URL}/api/connectors/garmin/callback`,
  authUrl: 'https://connect.garmin.com/oauthConfirm',
  tokenUrl: 'https://connectapi.garmin.com/oauth-service/oauth/token',
  scopes: [],
};

// Garmin uses OAuth 1.0a for legacy, but their Health API uses OAuth 2.0
// We use the Garmin Health API (developer.garmin.com/health-api)
export function getGarminAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GARMIN_CONFIG.clientId,
    redirect_uri: GARMIN_CONFIG.redirectUri,
    response_type: 'code',
    state,
  });
  return `https://connect.garmin.com/oauthConfirm?${params}`;
}

export async function exchangeGarminCode(code: string) {
  const res = await fetch(GARMIN_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GARMIN_CONFIG.clientId,
      client_secret: GARMIN_CONFIG.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: GARMIN_CONFIG.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Garmin token exchange failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number,
  };
}

export async function refreshGarminToken(refreshToken: string) {
  const res = await fetch(GARMIN_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GARMIN_CONFIG.clientId,
      client_secret: GARMIN_CONFIG.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('Garmin token refresh failed');
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number,
  };
}

const GARMIN_SPORT_MAP: Record<string, string> = {
  RUNNING: 'running',
  CYCLING: 'cyclisme',
  SWIMMING: 'natation',
  WALKING: 'fitness',
  HIKING: 'trail',
  STRENGTH_TRAINING: 'musculation',
  YOGA: 'yoga',
  OTHER: 'fitness',
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchGarminActivities(
  accessToken: string,
  startTimeInSeconds?: number,
  limit = 30,
): Promise<SyncedActivity[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (startTimeInSeconds) params.set('start', String(startTimeInSeconds));

  const res = await fetch(`https://apis.garmin.com/wellness-api/rest/activities?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Garmin activities fetch failed: ${res.status}`);
  const activities = await res.json();

  return (Array.isArray(activities) ? activities : []).map((a: any) => ({
    id: '',
    provider: 'garmin' as const,
    providerActivityId: String(a.activityId || a.summaryId),
    sport: GARMIN_SPORT_MAP[a.activityType] || 'fitness',
    title: a.activityName || a.activityType || 'Activité Garmin',
    durationSeconds: a.durationInSeconds || 0,
    distanceMeters: a.distanceInMeters || null,
    calories: a.activeKilocalories || a.calories || null,
    startTime: a.startTimeInSeconds
      ? new Date(a.startTimeInSeconds * 1000).toISOString()
      : new Date().toISOString(),
    avgHeartRate: a.averageHeartRateInBeatsPerMinute || null,
    maxHeartRate: a.maxHeartRateInBeatsPerMinute || null,
    elevationGain: a.totalElevationGainInMeters || null,
    averageSpeed: a.averageSpeedInMetersPerSecond || null,
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export { GARMIN_CONFIG };

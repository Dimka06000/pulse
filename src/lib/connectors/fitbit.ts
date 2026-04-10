import type { ConnectorConfig, SyncedActivity } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100';

const FITBIT_CONFIG: ConnectorConfig = {
  clientId: process.env.FITBIT_CLIENT_ID || '',
  clientSecret: process.env.FITBIT_CLIENT_SECRET || '',
  redirectUri: `${BASE_URL}/api/connectors/fitbit/callback`,
  authUrl: 'https://www.fitbit.com/oauth2/authorize',
  tokenUrl: 'https://api.fitbit.com/oauth2/token',
  scopes: ['activity', 'heartrate', 'sleep', 'profile'],
};

export function getFitbitAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: FITBIT_CONFIG.clientId,
    redirect_uri: FITBIT_CONFIG.redirectUri,
    response_type: 'code',
    scope: FITBIT_CONFIG.scopes.join(' '),
    state,
  });
  return `${FITBIT_CONFIG.authUrl}?${params}`;
}

export async function exchangeFitbitCode(code: string) {
  const basicAuth = Buffer.from(`${FITBIT_CONFIG.clientId}:${FITBIT_CONFIG.clientSecret}`).toString('base64');
  const res = await fetch(FITBIT_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: FITBIT_CONFIG.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Fitbit token exchange failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number,
    userId: data.user_id as string,
  };
}

export async function refreshFitbitToken(refreshToken: string) {
  const basicAuth = Buffer.from(`${FITBIT_CONFIG.clientId}:${FITBIT_CONFIG.clientSecret}`).toString('base64');
  const res = await fetch(FITBIT_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('Fitbit token refresh failed');
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number,
  };
}

const FITBIT_SPORT_MAP: Record<number, string> = {
  90013: 'running', // Run
  90001: 'cyclisme', // Bike
  15000: 'natation', // Swim
  90009: 'fitness', // Walk
  15680: 'musculation', // Weights
  15660: 'yoga', // Yoga
  15050: 'crossfit', // Circuit Training
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchFitbitActivities(
  accessToken: string,
  afterDate?: string,
  limit = 20,
): Promise<SyncedActivity[]> {
  const after = afterDate || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const res = await fetch(
    `https://api.fitbit.com/1/user/-/activities/list.json?afterDate=${after}&sort=desc&offset=0&limit=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Fitbit activities fetch failed: ${res.status}`);
  const data = await res.json();

  return (data.activities || []).map((a: any) => ({
    id: '',
    provider: 'fitbit' as const,
    providerActivityId: String(a.logId),
    sport: FITBIT_SPORT_MAP[a.activityTypeId] || 'fitness',
    title: a.activityName || 'Activité Fitbit',
    durationSeconds: Math.round((a.activeDuration || 0) / 1000),
    distanceMeters: a.distance ? a.distance * 1000 : null,
    calories: a.calories || null,
    startTime: a.startTime || new Date().toISOString(),
    avgHeartRate: a.averageHeartRate || null,
    maxHeartRate: null,
    elevationGain: a.elevationGain || null,
    averageSpeed: a.speed || null,
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export { FITBIT_CONFIG };

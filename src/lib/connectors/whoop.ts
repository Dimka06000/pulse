import type { ConnectorConfig, SyncedActivity } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100';

const WHOOP_CONFIG: ConnectorConfig = {
  clientId: process.env.WHOOP_CLIENT_ID || '',
  clientSecret: process.env.WHOOP_CLIENT_SECRET || '',
  redirectUri: `${BASE_URL}/api/connectors/whoop/callback`,
  authUrl: 'https://api.prod.whoop.com/oauth/oauth2/auth',
  tokenUrl: 'https://api.prod.whoop.com/oauth/oauth2/token',
  scopes: ['read:workout', 'read:recovery', 'read:sleep', 'read:profile'],
};

export function getWhoopAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: WHOOP_CONFIG.clientId,
    redirect_uri: WHOOP_CONFIG.redirectUri,
    response_type: 'code',
    scope: WHOOP_CONFIG.scopes.join(' '),
    state,
  });
  return `${WHOOP_CONFIG.authUrl}?${params}`;
}

export async function exchangeWhoopCode(code: string) {
  const res = await fetch(WHOOP_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: WHOOP_CONFIG.clientId,
      client_secret: WHOOP_CONFIG.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: WHOOP_CONFIG.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`WHOOP token exchange failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number,
  };
}

export async function refreshWhoopToken(refreshToken: string) {
  const res = await fetch(WHOOP_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: WHOOP_CONFIG.clientId,
      client_secret: WHOOP_CONFIG.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('WHOOP token refresh failed');
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number,
  };
}

const WHOOP_SPORT_MAP: Record<number, string> = {
  0: 'running',
  1: 'cyclisme',
  43: 'natation',
  44: 'musculation',
  52: 'yoga',
  63: 'crossfit',
  71: 'boxe',
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchWhoopWorkouts(
  accessToken: string,
  startDate?: string,
  limit = 25,
): Promise<SyncedActivity[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (startDate) params.set('start', startDate);

  const res = await fetch(`https://api.prod.whoop.com/developer/v1/activity/workout?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`WHOOP workouts fetch failed: ${res.status}`);
  const data = await res.json();

  return (data.records || []).map((w: any) => ({
    id: '',
    provider: 'whoop' as const,
    providerActivityId: String(w.id),
    sport: WHOOP_SPORT_MAP[w.sport_id] || 'fitness',
    title: w.score?.zone_duration ? 'WHOOP Workout' : 'Activité WHOOP',
    durationSeconds: w.score?.zone_duration
      ? Math.round(Object.values(w.score.zone_duration as Record<string, number>).reduce((a: number, b: number) => a + b, 0) / 1000)
      : 0,
    distanceMeters: w.score?.distance_meter || null,
    calories: w.score?.kilojoule ? Math.round(w.score.kilojoule / 4.184) : null,
    startTime: w.start || new Date().toISOString(),
    avgHeartRate: w.score?.average_heart_rate || null,
    maxHeartRate: w.score?.max_heart_rate || null,
    elevationGain: null,
    averageSpeed: null,
  }));
}

export async function fetchWhoopRecovery(accessToken: string, limit = 10) {
  const res = await fetch(`https://api.prod.whoop.com/developer/v1/recovery?limit=${limit}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.records || []).map((r: any) => ({
    date: r.created_at,
    recoveryScore: r.score?.recovery_score,
    restingHR: r.score?.resting_heart_rate,
    hrv: r.score?.hrv_rmssd_milli,
    sleepScore: r.sleep?.score?.sleep_performance_percentage,
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export { WHOOP_CONFIG };

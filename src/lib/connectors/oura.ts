import type { ConnectorConfig, SyncedActivity } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100';

const OURA_CONFIG: ConnectorConfig = {
  clientId: process.env.OURA_CLIENT_ID || '',
  clientSecret: process.env.OURA_CLIENT_SECRET || '',
  redirectUri: `${BASE_URL}/api/connectors/oura/callback`,
  authUrl: 'https://cloud.ouraring.com/oauth/authorize',
  tokenUrl: 'https://api.ouraring.com/oauth/token',
  scopes: ['daily', 'workout', 'sleep', 'personal'],
};

export function getOuraAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: OURA_CONFIG.clientId,
    redirect_uri: OURA_CONFIG.redirectUri,
    response_type: 'code',
    scope: OURA_CONFIG.scopes.join(' '),
    state,
  });
  return `${OURA_CONFIG.authUrl}?${params}`;
}

export async function exchangeOuraCode(code: string) {
  const res = await fetch(OURA_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: OURA_CONFIG.clientId,
      client_secret: OURA_CONFIG.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: OURA_CONFIG.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Oura token exchange failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number,
  };
}

export async function refreshOuraToken(refreshToken: string) {
  const res = await fetch(OURA_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: OURA_CONFIG.clientId,
      client_secret: OURA_CONFIG.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('Oura token refresh failed');
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchOuraWorkouts(
  accessToken: string,
  startDate?: string,
): Promise<SyncedActivity[]> {
  const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const res = await fetch(`https://api.ouraring.com/v2/usercollection/workout?start_date=${start}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Oura workouts fetch failed: ${res.status}`);
  const data = await res.json();

  return (data.data || []).map((w: any) => ({
    id: '',
    provider: 'oura' as const,
    providerActivityId: w.id || String(Date.now()),
    sport: w.activity?.toLowerCase() || 'fitness',
    title: w.activity || 'Activité Oura',
    durationSeconds: w.total_calories ? Math.round(w.total_calories * 3) : 0, // rough estimate
    distanceMeters: w.distance ? w.distance * 1000 : null,
    calories: w.total_calories || null,
    startTime: w.start_datetime || w.day || new Date().toISOString(),
    avgHeartRate: null,
    maxHeartRate: null,
    elevationGain: null,
    averageSpeed: null,
  }));
}

export async function fetchOuraSleep(accessToken: string, startDate?: string) {
  const start = startDate || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const res = await fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${start}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data || []).map((s: any) => ({
    date: s.day,
    score: s.score,
    totalSleepSeconds: s.contributors?.total_sleep,
    deepSleepSeconds: s.contributors?.deep_sleep,
    remSleepSeconds: s.contributors?.rem_sleep,
    efficiency: s.contributors?.efficiency,
    restfulness: s.contributors?.restfulness,
  }));
}

export async function fetchOuraReadiness(accessToken: string, startDate?: string) {
  const start = startDate || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const res = await fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${start}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data || []).map((r: any) => ({
    date: r.day,
    score: r.score,
    temperatureDeviation: r.contributors?.body_temperature,
    hrv: r.contributors?.hrv_balance,
    restingHR: r.contributors?.resting_heart_rate,
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export { OURA_CONFIG };

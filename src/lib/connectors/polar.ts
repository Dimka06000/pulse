import type { ConnectorConfig, SyncedActivity } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100';

const POLAR_CONFIG: ConnectorConfig = {
  clientId: process.env.POLAR_CLIENT_ID || '',
  clientSecret: process.env.POLAR_CLIENT_SECRET || '',
  redirectUri: `${BASE_URL}/api/connectors/polar/callback`,
  authUrl: 'https://flow.polar.com/oauth2/authorization',
  tokenUrl: 'https://polarremote.com/v2/oauth2/token',
  scopes: ['accesslink.read_all'],
};

export function getPolarAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: POLAR_CONFIG.clientId,
    redirect_uri: POLAR_CONFIG.redirectUri,
    response_type: 'code',
    scope: POLAR_CONFIG.scopes.join(' '),
    state,
  });
  return `${POLAR_CONFIG.authUrl}?${params}`;
}

export async function exchangePolarCode(code: string) {
  const basicAuth = Buffer.from(`${POLAR_CONFIG.clientId}:${POLAR_CONFIG.clientSecret}`).toString('base64');
  const res = await fetch(POLAR_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: POLAR_CONFIG.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Polar token exchange failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    userId: String(data.x_user_id || ''),
    expiresIn: data.expires_in as number,
  };
}

// Polar AccessLink: register user after first auth
export async function registerPolarUser(accessToken: string, memberId: string) {
  const res = await fetch('https://www.polaraccesslink.com/v3/users', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 'member-id': memberId }),
  });
  // 409 = already registered, that's fine
  if (!res.ok && res.status !== 409) throw new Error(`Polar register failed: ${res.status}`);
}

const POLAR_SPORT_MAP: Record<string, string> = {
  RUNNING: 'running',
  CYCLING: 'cyclisme',
  SWIMMING: 'natation',
  WALKING: 'fitness',
  HIKING: 'trail',
  STRENGTH_TRAINING: 'musculation',
  GROUP_EXERCISE: 'fitness',
  OTHER: 'fitness',
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchPolarActivities(
  accessToken: string,
): Promise<SyncedActivity[]> {
  // Polar uses a transaction-based pull: create transaction → list → commit
  const txRes = await fetch('https://www.polaraccesslink.com/v3/users/exercise-transactions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (txRes.status === 204) return []; // no new data
  if (!txRes.ok) throw new Error(`Polar transaction failed: ${txRes.status}`);
  const tx = await txRes.json();

  const listRes = await fetch(tx['resource-uri'], {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!listRes.ok) return [];
  const list = await listRes.json();

  const activities: SyncedActivity[] = [];
  for (const url of (list.exercises || [])) {
    const exRes = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!exRes.ok) continue;
    const a = await exRes.json();

    activities.push({
      id: '',
      provider: 'polar',
      providerActivityId: String(a.id),
      sport: POLAR_SPORT_MAP[a['detailed-sport-info']?.toUpperCase()] || POLAR_SPORT_MAP[a.sport?.toUpperCase()] || 'fitness',
      title: a.sport || 'Activité Polar',
      durationSeconds: parsePolarDuration(a.duration),
      distanceMeters: a.distance || null,
      calories: a.calories || null,
      startTime: a['start-time'] || new Date().toISOString(),
      avgHeartRate: a['heart-rate']?.average || null,
      maxHeartRate: a['heart-rate']?.maximum || null,
      elevationGain: null,
      averageSpeed: null,
    });
  }

  // Commit transaction
  await fetch(tx['resource-uri'], {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {});

  return activities;
}

function parsePolarDuration(duration: string | undefined): number {
  if (!duration) return 0;
  // Format: PT1H30M45S or PT45M
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] || '0') * 3600) + (parseInt(match[2] || '0') * 60) + parseInt(match[3] || '0');
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export { POLAR_CONFIG };

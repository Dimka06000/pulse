export type FitnessProvider = 'strava' | 'garmin' | 'fitbit' | 'apple_health';

export interface FitnessConnection {
  id: string;
  provider: FitnessProvider;
  providerUserId: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  profileData: Record<string, unknown>;
}

export interface SyncedActivity {
  id: string;
  provider: FitnessProvider;
  providerActivityId: string;
  sport: string;
  title: string;
  durationSeconds: number;
  distanceMeters: number | null;
  calories: number | null;
  startTime: string;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  elevationGain: number | null;
  averageSpeed: number | null;
}

export interface ConnectorConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
}

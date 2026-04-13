import type { Activity } from './types';

export interface UserTrainingProfile {
  ftpWatts?: number;
  maxHR?: number;
  restingHR?: number;
}

export function calculateTSS(activity: Activity, profile: UserTrainingProfile): number {
  if (activity.estimatedTss != null && activity.estimatedTss > 0) return activity.estimatedTss;
  if (activity.avgHR && profile.maxHR && profile.restingHR) {
    return hrTSS(activity.duration, activity.avgHR, profile.maxHR, profile.restingHR);
  }
  if (activity.sufferScore != null && activity.sufferScore > 0) return Math.round(activity.sufferScore);
  if (activity.rpe != null && activity.rpe > 0) return Math.round((activity.duration / 60) * activity.rpe * 10);
  return Math.round((activity.duration / 60) * 50);
}

function hrTSS(durationMin: number, avgHR: number, maxHR: number, restingHR: number): number {
  const hrReserve = Math.max(0, Math.min(1, (avgHR - restingHR) / (maxHR - restingHR)));
  const durationHr = durationMin / 60;
  const trimp = durationHr * hrReserve * 0.64 * Math.exp(1.92 * hrReserve);
  return Math.round(trimp * 100);
}

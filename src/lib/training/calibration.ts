import { calculateLoadMetrics, type DailyTSS } from './load-metrics';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CalibrationActivity {
  date: string;
  duration: number; // minutes
  sport: string;
  rpe?: number;
  avgHR?: number;
}

export interface AthleteCalibration {
  currentCtl: number;
  currentAtl: number;
  currentTsb: number;
  weeklyVolumeMin: number; // average weekly volume in minutes
  weeklySessionCount: number;
  primarySports: string[];
  suggestedLevel: 'beginner' | 'intermediate' | 'advanced';
  dataPoints: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const CALIBRATION_WINDOW_DAYS = 84; // 12 weeks

/**
 * Simplified TSS estimation from RPE or duration fallback.
 * Mirrors tss-calculator logic without needing a full user profile.
 */
function estimateTSS(durationMin: number, rpe?: number): number {
  if (rpe != null && rpe > 0) {
    // duration (hours) * rpe * 10  — same formula as tss-calculator RPE branch
    return Math.round((durationMin / 60) * rpe * 10);
  }
  // Fallback: assume moderate intensity (IF ~0.50 → TSS ≈ duration_hours * 50)
  return Math.round((durationMin / 60) * 50);
}

// ── Main ───────────────────────────────────────────────────────────────────

export function calibrateFromActivities(
  activities: CalibrationActivity[],
): AthleteCalibration {
  if (activities.length === 0) {
    return {
      currentCtl: 0,
      currentAtl: 0,
      currentTsb: 0,
      weeklyVolumeMin: 0,
      weeklySessionCount: 0,
      primarySports: [],
      suggestedLevel: 'beginner',
      dataPoints: 0,
    };
  }

  // 1. Filter to last 12 weeks
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - CALIBRATION_WINDOW_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const recent = activities.filter((a) => a.date >= cutoffStr);
  if (recent.length === 0) {
    return {
      currentCtl: 0,
      currentAtl: 0,
      currentTsb: 0,
      weeklyVolumeMin: 0,
      weeklySessionCount: 0,
      primarySports: [],
      suggestedLevel: 'beginner',
      dataPoints: 0,
    };
  }

  // 2. Build daily TSS, aggregating multiple activities per day
  const dailyMap = new Map<string, number>();
  for (const a of recent) {
    const day = a.date.slice(0, 10);
    const tss = estimateTSS(a.duration, a.rpe);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + tss);
  }

  // Fill from first activity day to today so CTL/ATL decay correctly
  const todayStr = now.toISOString().slice(0, 10);
  const dates = [...dailyMap.keys()].sort();
  const firstDate = dates[0];
  const dailyTSS: DailyTSS[] = [];
  for (
    let d = new Date(firstDate);
    d.toISOString().slice(0, 10) <= todayStr;
    d.setDate(d.getDate() + 1)
  ) {
    const iso = d.toISOString().slice(0, 10);
    dailyTSS.push({ date: iso, tss: dailyMap.get(iso) ?? 0 });
  }

  // 3. Calculate CTL / ATL / TSB
  const { ctl, atl, tsb } = calculateLoadMetrics(dailyTSS);

  // 4. Weekly volume — total minutes / weeks that had at least one activity
  const weekBuckets = new Set<string>();
  let totalMinutes = 0;
  for (const a of recent) {
    totalMinutes += a.duration;
    // ISO week bucket: year + week number
    const d = new Date(a.date);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(
      ((d.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7,
    );
    weekBuckets.add(`${d.getFullYear()}-W${weekNum}`);
  }
  const weeksWithData = Math.max(1, weekBuckets.size);
  const weeklyVolumeMin = Math.round(totalMinutes / weeksWithData);
  const weeklySessionCount = Math.round(recent.length / weeksWithData * 10) / 10;

  // 5. Determine suggested level
  const weeklyHours = weeklyVolumeMin / 60;
  let suggestedLevel: AthleteCalibration['suggestedLevel'];
  if (weeklyHours > 7 || weeklySessionCount > 5) {
    suggestedLevel = 'advanced';
  } else if (weeklyHours >= 3 && weeklySessionCount >= 3) {
    suggestedLevel = 'intermediate';
  } else {
    suggestedLevel = 'beginner';
  }

  // 6. Primary sports (top 3 by frequency)
  const sportCounts = new Map<string, number>();
  for (const a of recent) {
    sportCounts.set(a.sport, (sportCounts.get(a.sport) ?? 0) + 1);
  }
  const primarySports = [...sportCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([sport]) => sport);

  return {
    currentCtl: ctl,
    currentAtl: atl,
    currentTsb: tsb,
    weeklyVolumeMin,
    weeklySessionCount,
    primarySports,
    suggestedLevel,
    dataPoints: recent.length,
  };
}

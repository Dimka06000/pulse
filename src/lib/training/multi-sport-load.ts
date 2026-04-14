// ── Multi-Sport Load Metrics ──
// Combined CTL/ATL/TSB calculation for triathlon/duathlon programs.
// Each discipline is tracked separately and a weighted combined score is produced.

import { calculateLoadMetrics, type DailyTSS } from './load-metrics';
import type { LoadMetrics, LoadHistory, Activity, Discipline } from './types';

export interface MultiSportLoad {
  combined: LoadMetrics;
  combinedHistory: LoadHistory[];
  perDiscipline: Partial<Record<Discipline, LoadMetrics & { history: LoadHistory[] }>>;
  dominantDiscipline: Discipline;
  balanceScore: number; // 0-100: 100 = perfectly balanced, 0 = only one discipline trained
}

// Weights for combining discipline loads into a single score.
// Swim contributes less volume-wise but is still tracked.
const COMBINE_WEIGHTS: Partial<Record<Discipline, number>> = {
  swim: 0.15,
  bike: 0.45,
  run: 0.40,
};

export function calculateMultiSportLoad(
  activities: Activity[],
  disciplines: Discipline[],
): MultiSportLoad {
  if (activities.length === 0) {
    const empty: LoadMetrics = { ctl: 0, atl: 0, tsb: 0 };
    return {
      combined: empty,
      combinedHistory: [],
      perDiscipline: {},
      dominantDiscipline: disciplines[0] ?? 'run',
      balanceScore: 0,
    };
  }

  // Build per-discipline daily TSS maps
  const perDiscipline: MultiSportLoad['perDiscipline'] = {};
  const disciplineVolumes: Partial<Record<Discipline, number>> = {};

  for (const disc of disciplines) {
    const discActivities = activities.filter((a) => a.discipline === disc);
    if (discActivities.length === 0) continue;

    const dailyMap = new Map<string, number>();
    for (const act of discActivities) {
      const date = act.date.slice(0, 10);
      const tss = act.tss ?? act.estimatedTss ?? Math.round((act.duration / 60) * 50);
      dailyMap.set(date, (dailyMap.get(date) ?? 0) + tss);
    }

    const dailyTSS: DailyTSS[] = Array.from(dailyMap.entries()).map(([date, tss]) => ({
      date,
      tss,
    }));

    const metrics = calculateLoadMetrics(dailyTSS);
    perDiscipline[disc] = { ...metrics };

    // Total TSS for this discipline
    disciplineVolumes[disc] = dailyTSS.reduce((sum, d) => sum + d.tss, 0);
  }

  // Combined load: weighted sum of per-discipline CTL/ATL
  const activeDiscs = Object.keys(perDiscipline) as Discipline[];

  // Build combined daily TSS using weighted contributions
  const allDates = new Set<string>();
  activities.forEach((a) => allDates.add(a.date.slice(0, 10)));

  const combinedDailyMap = new Map<string, number>();
  for (const act of activities) {
    const disc = act.discipline as Discipline;
    if (!disciplines.includes(disc)) continue;
    const weight = COMBINE_WEIGHTS[disc] ?? 0.33;
    const date = act.date.slice(0, 10);
    const tss = act.tss ?? act.estimatedTss ?? Math.round((act.duration / 60) * 50);
    combinedDailyMap.set(date, (combinedDailyMap.get(date) ?? 0) + tss * weight);
  }

  const combinedDailyTSS: DailyTSS[] = Array.from(combinedDailyMap.entries()).map(
    ([date, tss]) => ({ date, tss: Math.round(tss) }),
  );

  const combinedMetrics = calculateLoadMetrics(combinedDailyTSS);

  // Dominant discipline: highest total volume
  let dominantDiscipline: Discipline = disciplines[0] ?? 'run';
  let maxVolume = -1;
  for (const [disc, vol] of Object.entries(disciplineVolumes)) {
    if ((vol ?? 0) > maxVolume) {
      maxVolume = vol ?? 0;
      dominantDiscipline = disc as Discipline;
    }
  }

  // Balance score: 100 = all disciplines trained equally
  const balanceScore = computeBalanceScore(disciplineVolumes, disciplines);

  return {
    combined: { ctl: combinedMetrics.ctl, atl: combinedMetrics.atl, tsb: combinedMetrics.tsb },
    combinedHistory: combinedMetrics.history,
    perDiscipline,
    dominantDiscipline,
    balanceScore,
  };
}

/**
 * Compute how balanced the training load is across disciplines.
 * 100 = equal time per discipline, 0 = all time in one discipline.
 */
function computeBalanceScore(
  volumes: Partial<Record<Discipline, number>>,
  disciplines: Discipline[],
): number {
  if (disciplines.length <= 1) return 100;

  const vols = disciplines.map((d) => volumes[d] ?? 0);
  const total = vols.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;

  const n = disciplines.length;
  const idealShare = 1 / n;
  const actualShares = vols.map((v) => v / total);

  // Sum of squared deviations from ideal share, normalized to [0, 1]
  const maxDeviation = 2 * (1 - idealShare) ** 2 * (n - 1); // worst case: all volume in one disc
  const deviation = actualShares.reduce(
    (sum, share) => sum + (share - idealShare) ** 2,
    0,
  );

  const score = Math.max(0, 1 - deviation / (maxDeviation || 1));
  return Math.round(score * 100);
}

/**
 * Compute per-discipline volume summary from workouts for a program.
 * Workout data includes a `discipline` tag or falls back to sport-level discipline.
 */
export function computeWeeklyDisciplineVolume(
  workouts: Array<{ duration_minutes: number; workout_data?: { discipline?: Discipline } }>,
  disciplines: Discipline[],
): Partial<Record<Discipline, { minutes: number; count: number }>> {
  const result: Partial<Record<Discipline, { minutes: number; count: number }>> = {};

  for (const disc of disciplines) {
    result[disc] = { minutes: 0, count: 0 };
  }

  for (const w of workouts) {
    const disc = w.workout_data?.discipline;
    if (disc && disciplines.includes(disc) && result[disc]) {
      result[disc]!.minutes += w.duration_minutes;
      result[disc]!.count += 1;
    }
  }

  return result;
}

/** Format duration in minutes as "Xh Ymin" or "Ymin" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, '0')}`;
}

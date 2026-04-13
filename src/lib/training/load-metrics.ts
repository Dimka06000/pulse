import type { LoadHistory } from './types';

const CTL_DECAY = 1 - Math.exp(-1 / 42);
const ATL_DECAY = 1 - Math.exp(-1 / 7);

export interface DailyTSS {
  date: string;
  tss: number;
}

export function calculateLoadMetrics(dailyTSS: DailyTSS[]): {
  ctl: number;
  atl: number;
  tsb: number;
  history: LoadHistory[];
} {
  if (dailyTSS.length === 0) return { ctl: 0, atl: 0, tsb: 0, history: [] };
  const sorted = [...dailyTSS].sort((a, b) => a.date.localeCompare(b.date));
  const filled = fillMissingDays(sorted);
  let ctl = 0, atl = 0;
  const history: LoadHistory[] = [];
  for (const day of filled) {
    ctl = ctl + (day.tss - ctl) * CTL_DECAY;
    atl = atl + (day.tss - atl) * ATL_DECAY;
    history.push({
      date: day.date,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round((ctl - atl) * 10) / 10,
    });
  }
  const latest = history[history.length - 1];
  return { ctl: Math.round(latest.ctl), atl: Math.round(latest.atl), tsb: Math.round(latest.tsb), history };
}

function fillMissingDays(sorted: DailyTSS[]): DailyTSS[] {
  if (sorted.length === 0) return [];
  const result: DailyTSS[] = [];
  const start = new Date(sorted[0].date);
  const end = new Date(sorted[sorted.length - 1].date);
  const tssMap = new Map(sorted.map((d) => [d.date, d.tss]));
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    result.push({ date: iso, tss: tssMap.get(iso) ?? 0 });
  }
  return result;
}

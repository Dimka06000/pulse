// ─────────────────────────────────────────────────────────────────────────────
// Pulse Intelligence Engine — pure functions, no DB calls
// ─────────────────────────────────────────────────────────────────────────────

import { SPORT_LABELS, type Sport } from '@/lib/sports';

/* ─── Types ────────────────────────────────────────────────────────────────── */

export interface WeeklyDigest {
  period: string;
  totalSessions: number;
  totalMinutes: number;
  vsLastWeek: { sessions: number; minutes: number };
  topSport: { sport: string; count: number } | null;
  newRecords: { sport: string; metric: string; value: number; unit: string }[];
  streak: number;
  insights: string[];
  suggestion: string;
}

export interface Correlation {
  factor: string;
  factorLabel: string;
  metric: string;
  metricLabel: string;
  withFactor: number;
  withoutFactor: number;
  deltaPercent: number;
  direction: 'positive' | 'negative';
  sentence: string;
}

export interface WorkoutSuggestion {
  type: 'rest' | 'light' | 'moderate' | 'intense';
  sport: string;
  title: string;
  reason: string;
  durationMinutes: number;
}

export interface InjuryRisk {
  level: 'low' | 'medium' | 'high';
  message: string;
  factors: string[];
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function sportLabel(sport: string): string {
  return SPORT_LABELS[sport as Sport] || sport;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function formatPeriod(): string {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  const s = start.toLocaleDateString('fr-FR', opts);
  const e = now.toLocaleDateString('fr-FR', { ...opts, year: 'numeric' });
  return `${s} - ${e}`;
}

function daysBetween(a: string | Date, b: string | Date): number {
  const msA = new Date(a).getTime();
  const msB = new Date(b).getTime();
  return Math.abs(msB - msA) / (1000 * 60 * 60 * 24);
}

/* ─── Weekly Digest ────────────────────────────────────────────────────────── */

export function computeWeeklyDigest(data: {
  sessions: Array<{ sport: string; duration_minutes: number; scheduled_at: string; completed: boolean }>;
  lastWeekSessions: Array<{ duration_minutes: number }>;
  records: Array<{ sport: string; metric_key: string; value: number; unit: string; achieved_at: string }>;
  streak: number;
  journalEntries: Array<{ energy_level: number; mood: number; sleep_hours: number }>;
}): WeeklyDigest {
  const { sessions, lastWeekSessions, records, streak, journalEntries } = data;

  const completedSessions = sessions.filter(s => s.completed);
  const totalSessions = completedSessions.length;
  const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  const lastWeekTotal = lastWeekSessions.length;
  const lastWeekMinutes = lastWeekSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  const sessionDelta = totalSessions - lastWeekTotal;
  const minutesDelta = totalMinutes - lastWeekMinutes;

  // Top sport
  const sportCounts: Record<string, number> = {};
  for (const s of completedSessions) {
    sportCounts[s.sport] = (sportCounts[s.sport] || 0) + 1;
  }
  const topSportEntry = Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0];
  const topSport = topSportEntry ? { sport: topSportEntry[0], count: topSportEntry[1] } : null;

  // Records this week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const newRecords = records
    .filter(r => new Date(r.achieved_at) >= oneWeekAgo)
    .map(r => ({ sport: r.sport, metric: r.metric_key, value: r.value, unit: r.unit }));

  // Insights
  const insights: string[] = [];

  if (sessionDelta > 0) {
    insights.push(`Vous avez été plus actif cette semaine (+${sessionDelta} séance${sessionDelta > 1 ? 's' : ''})`);
  } else if (sessionDelta < 0) {
    insights.push('Semaine plus calme. Parfois le repos est la meilleure stratégie.');
  } else if (totalSessions > 0) {
    insights.push('Rythme stable par rapport à la semaine dernière. Bonne régularité !');
  }

  if (newRecords.length > 0) {
    const sportNames = [...new Set(newRecords.map(r => sportLabel(r.sport)))].join(', ');
    insights.push(`Nouveau record en ${sportNames} !`);
  }

  if (streak > 7) {
    insights.push(`Série de ${streak} jours consécutifs ! Impressionnant.`);
  } else if (streak > 3) {
    insights.push(`${streak} jours de suite, continuez comme ça !`);
  }

  const energyValues = journalEntries.map(e => e.energy_level).filter(v => v != null);
  const avgEnergy = avg(energyValues);
  if (avgEnergy > 4) {
    insights.push('Votre énergie est au top cette semaine.');
  } else if (avgEnergy > 0 && avgEnergy < 2.5) {
    insights.push('Fatigue détectée. Pensez à lever le pied.');
  }

  // Suggestion
  let suggestion: string;
  if (avgEnergy > 0 && avgEnergy < 2.5) {
    suggestion = 'Accordez-vous une journée de récupération active (marche, étirements).';
  } else if (totalSessions === 0) {
    suggestion = 'Commencez la semaine par une séance courte pour lancer la dynamique.';
  } else if (sessionDelta > 2) {
    suggestion = 'Belle progression ! Veillez à inclure des jours de repos pour éviter le surentraînement.';
  } else if (topSport && topSport.count >= 3) {
    suggestion = `Vous faites beaucoup de ${sportLabel(topSport.sport)}. Essayez un sport complémentaire pour l'équilibre musculaire.`;
  } else {
    suggestion = 'Continuez sur cette lancée et pensez à varier vos entraînements.';
  }

  return {
    period: formatPeriod(),
    totalSessions,
    totalMinutes,
    vsLastWeek: { sessions: sessionDelta, minutes: minutesDelta },
    topSport,
    newRecords,
    streak,
    insights,
    suggestion,
  };
}

/* ─── Correlations ─────────────────────────────────────────────────────────── */

export function computeCorrelations(
  journalEntries: Array<{
    date: string;
    sleep_hours: number | null;
    sleep_quality: number | null;
    energy_level: number | null;
    stress_level: number | null;
    mood: number | null;
    alcohol: boolean;
    caffeine_cups: number;
  }>,
  sessions: Array<{ scheduled_at: string; duration_minutes: number }>,
): Correlation[] {
  if (journalEntries.length < 7) return [];

  const correlations: Correlation[] = [];

  // Helper to build a correlation
  function tryCorrelation(
    factor: string,
    factorLabel: string,
    metric: string,
    metricLabel: string,
    splitFn: (entry: (typeof journalEntries)[0]) => boolean | null,
    valueFn: (entry: (typeof journalEntries)[0]) => number | null,
    sentenceTemplate: string,
  ) {
    const withGroup: number[] = [];
    const withoutGroup: number[] = [];

    for (const entry of journalEntries) {
      const split = splitFn(entry);
      const val = valueFn(entry);
      if (split === null || val === null) continue;
      if (split) withGroup.push(val);
      else withoutGroup.push(val);
    }

    if (withGroup.length < 3 || withoutGroup.length < 3) return;

    const withAvg = avg(withGroup);
    const withoutAvg = avg(withoutGroup);
    if (withoutAvg === 0) return;

    const delta = ((withAvg - withoutAvg) / withoutAvg) * 100;
    const absDelta = Math.abs(delta);

    if (absDelta > 10) {
      correlations.push({
        factor,
        factorLabel,
        metric,
        metricLabel,
        withFactor: Math.round(withAvg * 10) / 10,
        withoutFactor: Math.round(withoutAvg * 10) / 10,
        deltaPercent: Math.round(absDelta),
        direction: delta > 0 ? 'positive' : 'negative',
        sentence: sentenceTemplate.replace('{delta}', String(Math.round(absDelta))),
      });
    }
  }

  // Sleep > 7h → energy
  tryCorrelation(
    'sleep_hours', 'Sommeil > 7h',
    'energy_level', 'Niveau d\'énergie',
    e => e.sleep_hours != null ? e.sleep_hours > 7 : null,
    e => e.energy_level,
    'Quand vous dormez > 7h, votre énergie est {delta}% plus élevée',
  );

  // Sleep > 7h → mood
  tryCorrelation(
    'sleep_hours', 'Sommeil > 7h',
    'mood', 'Humeur',
    e => e.sleep_hours != null ? e.sleep_hours > 7 : null,
    e => e.mood,
    'Quand vous dormez > 7h, votre humeur est {delta}% meilleure',
  );

  // Alcohol → next day energy
  // Build a map of date → energy for next-day lookup
  const energyByDate: Record<string, number> = {};
  for (const e of journalEntries) {
    if (e.energy_level != null) energyByDate[e.date] = e.energy_level;
  }

  const alcoholWith: number[] = [];
  const alcoholWithout: number[] = [];
  for (const e of journalEntries) {
    const nextDay = new Date(e.date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];
    const nextEnergy = energyByDate[nextDayStr];
    if (nextEnergy == null) continue;
    if (e.alcohol) alcoholWith.push(nextEnergy);
    else alcoholWithout.push(nextEnergy);
  }
  if (alcoholWith.length >= 3 && alcoholWithout.length >= 3) {
    const withAvg = avg(alcoholWith);
    const withoutAvg = avg(alcoholWithout);
    if (withoutAvg > 0) {
      const delta = ((withAvg - withoutAvg) / withoutAvg) * 100;
      if (Math.abs(delta) > 10) {
        correlations.push({
          factor: 'alcohol',
          factorLabel: 'Alcool',
          metric: 'energy_level',
          metricLabel: 'Énergie le lendemain',
          withFactor: Math.round(withAvg * 10) / 10,
          withoutFactor: Math.round(withoutAvg * 10) / 10,
          deltaPercent: Math.round(Math.abs(delta)),
          direction: delta > 0 ? 'positive' : 'negative',
          sentence: `Les jours après alcool, votre énergie est ${Math.round(Math.abs(delta))}% plus ${delta < 0 ? 'basse' : 'élevée'}`,
        });
      }
    }
  }

  // Caffeine > 2 → stress
  tryCorrelation(
    'caffeine', 'Caféine > 2 tasses',
    'stress_level', 'Niveau de stress',
    e => e.caffeine_cups != null ? e.caffeine_cups > 2 : null,
    e => e.stress_level,
    'Avec > 2 cafés, votre stress est {delta}% plus élevé',
  );

  // Training days → mood
  const sessionDates = new Set(
    sessions.map(s => new Date(s.scheduled_at).toISOString().split('T')[0]),
  );

  const trainingMoods: number[] = [];
  const restMoods: number[] = [];
  for (const e of journalEntries) {
    if (e.mood == null) continue;
    if (sessionDates.has(e.date)) trainingMoods.push(e.mood);
    else restMoods.push(e.mood);
  }
  if (trainingMoods.length >= 3 && restMoods.length >= 3) {
    const tAvg = avg(trainingMoods);
    const rAvg = avg(restMoods);
    if (rAvg > 0) {
      const delta = ((tAvg - rAvg) / rAvg) * 100;
      if (Math.abs(delta) > 10) {
        correlations.push({
          factor: 'training',
          factorLabel: 'Jour d\'entraînement',
          metric: 'mood',
          metricLabel: 'Humeur',
          withFactor: Math.round(tAvg * 10) / 10,
          withoutFactor: Math.round(rAvg * 10) / 10,
          deltaPercent: Math.round(Math.abs(delta)),
          direction: delta > 0 ? 'positive' : 'negative',
          sentence: `Les jours d'entraînement, votre humeur est ${Math.round(Math.abs(delta))}% ${delta > 0 ? 'meilleure' : 'moins bonne'}`,
        });
      }
    }
  }

  return correlations;
}

/* ─── Workout Suggestion ───────────────────────────────────────────────────── */

export function suggestWorkout(data: {
  recentSessions: Array<{ sport: string; duration_minutes: number; scheduled_at: string }>;
  journalToday: { energy_level: number; sleep_hours: number; stress_level: number } | null;
  streak: number;
  favoriteSports: string[];
}): WorkoutSuggestion {
  const { recentSessions, journalToday, streak, favoriteSports } = data;

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);

  const recentIntense = recentSessions.filter(
    s => new Date(s.scheduled_at) >= threeDaysAgo && s.duration_minutes >= 45,
  );

  // Low energy or bad sleep → light
  if (journalToday && (journalToday.energy_level < 2 || journalToday.sleep_hours < 5)) {
    return {
      type: 'light',
      sport: 'yoga',
      title: 'Séance douce & récupération',
      reason: 'Votre corps a besoin de récupération. Une séance légère vous fera du bien.',
      durationMinutes: 20,
    };
  }

  // 3+ intense sessions in last 3 days → rest
  if (recentIntense.length >= 3) {
    return {
      type: 'rest',
      sport: 'meditation',
      title: 'Jour de repos actif',
      reason: 'Votre corps a besoin de récupération après 3 séances intenses consécutives.',
      durationMinutes: 15,
    };
  }

  // No sessions in 3+ days → moderate to get back
  const lastSessionDate = recentSessions.length > 0
    ? Math.max(...recentSessions.map(s => new Date(s.scheduled_at).getTime()))
    : 0;
  const daysSinceLastSession = lastSessionDate > 0
    ? (now.getTime() - lastSessionDate) / 86400000
    : Infinity;

  if (daysSinceLastSession >= 3 || recentSessions.length === 0) {
    const sport = favoriteSports[0] || 'running';
    return {
      type: 'moderate',
      sport,
      title: `Reprise en ${sportLabel(sport)}`,
      reason: 'Cela fait quelques jours sans entraînement. Une séance modérée pour reprendre le rythme.',
      durationMinutes: 30,
    };
  }

  // Long streak + good energy → try something new
  if (streak > 14 && journalToday && journalToday.energy_level > 3) {
    const practiced = new Set(recentSessions.map(s => s.sport));
    const newSport = favoriteSports.find(s => !practiced.has(s))
      || ['natation', 'cyclisme', 'yoga', 'boxe'].find(s => !practiced.has(s))
      || 'natation';
    return {
      type: 'moderate',
      sport: newSport,
      title: `Essayez le ${sportLabel(newSport)}`,
      reason: `Série de ${streak} jours ! Parfait pour tester un nouveau sport et surprendre votre corps.`,
      durationMinutes: 40,
    };
  }

  // Default: moderate in favorite sport
  const sport = favoriteSports[0] || 'running';
  return {
    type: 'moderate',
    sport,
    title: `Séance de ${sportLabel(sport)}`,
    reason: 'Bonne condition pour un entraînement modéré. En avant !',
    durationMinutes: 40,
  };
}

/* ─── Injury Risk ──────────────────────────────────────────────────────────── */

export function assessInjuryRisk(data: {
  sessionsLast14Days: Array<{ duration_minutes: number; sport: string; scheduled_at: string }>;
  journalLast7Days: Array<{ energy_level: number; stress_level: number; sleep_hours: number }>;
}): InjuryRisk {
  const { sessionsLast14Days, journalLast7Days } = data;
  const factors: string[] = [];

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

  const thisWeek = sessionsLast14Days.filter(s => new Date(s.scheduled_at) >= sevenDaysAgo);
  const lastWeek = sessionsLast14Days.filter(s => new Date(s.scheduled_at) < sevenDaysAgo);

  const thisWeekCount = thisWeek.length;
  const lastWeekCount = lastWeek.length;

  // Volume spike detection
  let volumeIncrease = 0;
  if (lastWeekCount > 0) {
    volumeIncrease = ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;
  }

  if (volumeIncrease > 100) {
    factors.push(`Augmentation brutale du volume (+${Math.round(volumeIncrease)}% vs semaine précédente)`);
  } else if (volumeIncrease > 50) {
    factors.push(`Volume en hausse (+${Math.round(volumeIncrease)}% vs semaine précédente)`);
  }

  // Sleep check
  const sleepValues = journalLast7Days.map(j => j.sleep_hours).filter(v => v != null);
  const avgSleep = avg(sleepValues);
  if (avgSleep > 0 && avgSleep < 6 && thisWeekCount >= 5) {
    factors.push(`Manque de sommeil (${avgSleep.toFixed(1)}h en moyenne) combiné à un volume élevé`);
  }

  // Energy check
  const energyValues = journalLast7Days.map(j => j.energy_level).filter(v => v != null);
  const avgEnergyVal = avg(energyValues);
  if (avgEnergyVal > 0 && avgEnergyVal < 2 && thisWeekCount >= 3) {
    factors.push('Énergie très basse malgré un entraînement soutenu');
  }

  // Stress check
  const stressValues = journalLast7Days.map(j => j.stress_level).filter(v => v != null);
  const avgStress = avg(stressValues);
  if (avgStress > 4 && thisWeekCount >= 4) {
    factors.push('Niveau de stress élevé combiné à un volume d\'entraînement important');
  }

  // Determine level
  let level: InjuryRisk['level'] = 'low';
  let message = 'Risque faible. Continuez à écouter votre corps.';

  if (factors.length >= 2 || volumeIncrease > 100 || (avgSleep > 0 && avgSleep < 6 && thisWeekCount >= 5)) {
    level = 'high';
    message = 'Risque élevé de blessure. Réduisez l\'intensité et privilégiez la récupération.';
  } else if (factors.length === 1 || volumeIncrease > 50) {
    level = 'medium';
    message = 'Attention, quelques signaux de surcharge. Pensez à intégrer plus de repos.';
  }

  return { level, message, factors };
}

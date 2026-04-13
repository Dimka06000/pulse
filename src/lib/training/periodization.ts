import type { TrainingPhase } from './types';

export interface PeriodizationInput {
  startDate: string;       // ISO date YYYY-MM-DD
  eventDate: string;       // ISO date YYYY-MM-DD
  sport: string;
  athleteLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface GeneratedBlock {
  title: string;
  phase: TrainingPhase;
  focus: string;
  weekStart: number;
  weekEnd: number;
  progressionCurve: number[];
  weeklyVolumeMin: number;
  weeklyTSS: number;
}

// French titles per phase
const PHASE_TITLES: Record<TrainingPhase, string> = {
  base:     'Phase de base',
  build:    'Construction',
  peak:     'Pic de forme',
  taper:    'Affûtage',
  race:     'Compétition',
  recovery: 'Récupération',
};

// Focus mapping
const PHASE_FOCUS: Record<TrainingPhase, string> = {
  base:     'endurance',
  build:    'strength',
  peak:     'power',
  taper:    'recovery',
  race:     'general',
  recovery: 'recovery',
};

// Base weekly volume (minutes) for advanced athletes
const BASE_VOLUME: Record<TrainingPhase, number> = {
  base:     600,
  build:    800,
  peak:     900,
  taper:    400,
  race:     120,
  recovery: 240,
};

// Level multipliers
const LEVEL_MULTIPLIER: Record<PeriodizationInput['athleteLevel'], number> = {
  beginner:     0.6,
  intermediate: 0.8,
  advanced:     1.0,
};

/**
 * Builds a progression curve array for N weeks following the 3+1 deload model.
 * Special handling for taper, race, and recovery phases.
 */
function buildProgressionCurve(phase: TrainingPhase, weeks: number): number[] {
  if (phase === 'race') return [100];

  if (phase === 'recovery') {
    return Array(weeks).fill(40);
  }

  if (phase === 'taper') {
    // Descending [80, 60, 40, ...], clamped to weeks length
    const taperPattern = [80, 60, 40];
    return Array.from({ length: weeks }, (_, i) => taperPattern[Math.min(i, taperPattern.length - 1)]);
  }

  // Standard 3+1 block: week1=70%, week2=80%, week3=90%, week4=60% (deload)
  return Array.from({ length: weeks }, (_, i) => {
    const positionInCycle = (i % 4) + 1;
    if (positionInCycle === 4) return 60; // deload
    return 60 + positionInCycle * 10;     // 70, 80, 90
  });
}

/**
 * Creates a single GeneratedBlock.
 */
function createBlock(
  phase: TrainingPhase,
  weekStart: number,
  weekEnd: number,
  level: PeriodizationInput['athleteLevel'],
): GeneratedBlock {
  const weeks = weekEnd - weekStart + 1;
  const multiplier = LEVEL_MULTIPLIER[level];
  const weeklyVolumeMin = Math.round(BASE_VOLUME[phase] * multiplier);
  const weeklyTSS = Math.round((weeklyVolumeMin / 60) * 50);

  return {
    title: PHASE_TITLES[phase],
    phase,
    focus: PHASE_FOCUS[phase],
    weekStart,
    weekEnd,
    progressionCurve: buildProgressionCurve(phase, weeks),
    weeklyVolumeMin,
    weeklyTSS,
  };
}

/**
 * Distributes a total week count into phase durations (in weeks) based on program length.
 * Returns phase durations in order of appearance.
 */
interface PhasePlan {
  phase: TrainingPhase;
  weeks: number;
}

function distributePhasesShort(totalWeeks: number): PhasePlan[] {
  // < 8 weeks: build 60%, taper 25%, race 1, recovery 2
  const recoveryWeeks = 2;
  const raceWeeks = 1;
  const remaining = totalWeeks - recoveryWeeks - raceWeeks;
  const taperWeeks = Math.max(1, Math.round(remaining * 0.25));
  const buildWeeks = Math.max(1, remaining - taperWeeks);

  return [
    { phase: 'build', weeks: buildWeeks },
    { phase: 'taper', weeks: taperWeeks },
    { phase: 'race', weeks: raceWeeks },
    { phase: 'recovery', weeks: recoveryWeeks },
  ];
}

function distributePhasesMedium(totalWeeks: number): PhasePlan[] {
  // 8-16 weeks: base 30%, build 35%, peak 15%, taper 10%, race 1, recovery 2
  const recoveryWeeks = 2;
  const raceWeeks = 1;
  const programmableWeeks = totalWeeks - recoveryWeeks - raceWeeks;

  const baseWeeks  = Math.max(1, Math.round(programmableWeeks * 0.30));
  const buildWeeks = Math.max(1, Math.round(programmableWeeks * 0.35));
  const taperWeeks = Math.max(1, Math.round(programmableWeeks * 0.10));
  const peakWeeks  = Math.max(1, programmableWeeks - baseWeeks - buildWeeks - taperWeeks);

  return [
    { phase: 'base',     weeks: baseWeeks },
    { phase: 'build',    weeks: buildWeeks },
    { phase: 'peak',     weeks: peakWeeks },
    { phase: 'taper',    weeks: taperWeeks },
    { phase: 'race',     weeks: raceWeeks },
    { phase: 'recovery', weeks: recoveryWeeks },
  ];
}

function distributePhasesLong(totalWeeks: number): PhasePlan[] {
  // 16+ weeks: base 25%, build 30%, peak 20%, taper 10%, race 1, recovery 15% (min 2)
  const raceWeeks = 1;
  const programmableWeeks = totalWeeks - raceWeeks;

  const baseWeeks     = Math.max(1, Math.round(programmableWeeks * 0.25));
  const buildWeeks    = Math.max(1, Math.round(programmableWeeks * 0.30));
  const peakWeeks     = Math.max(1, Math.round(programmableWeeks * 0.20));
  const taperWeeks    = Math.max(1, Math.round(programmableWeeks * 0.10));
  const recoveryWeeks = Math.max(2, programmableWeeks - baseWeeks - buildWeeks - peakWeeks - taperWeeks);

  return [
    { phase: 'base',     weeks: baseWeeks },
    { phase: 'build',    weeks: buildWeeks },
    { phase: 'peak',     weeks: peakWeeks },
    { phase: 'taper',    weeks: taperWeeks },
    { phase: 'race',     weeks: raceWeeks },
    { phase: 'recovery', weeks: recoveryWeeks },
  ];
}

export function generatePeriodization(input: PeriodizationInput): GeneratedBlock[] {
  const start = new Date(input.startDate).getTime();
  const event = new Date(input.eventDate).getTime();

  // Weeks until the event
  const weeksToEvent = Math.ceil((event - start) / (7 * 86_400_000));
  // Total program = weeks until event + 2 recovery weeks
  const totalWeeks = weeksToEvent + 2;

  let plans: PhasePlan[];
  if (weeksToEvent < 8) {
    plans = distributePhasesShort(totalWeeks);
  } else if (weeksToEvent <= 16) {
    plans = distributePhasesMedium(totalWeeks);
  } else {
    plans = distributePhasesLong(totalWeeks);
  }

  const blocks: GeneratedBlock[] = [];
  let cursor = 1;

  for (const plan of plans) {
    const weekStart = cursor;
    const weekEnd = cursor + plan.weeks - 1;
    blocks.push(createBlock(plan.phase, weekStart, weekEnd, input.athleteLevel));
    cursor = weekEnd + 1;
  }

  return blocks;
}

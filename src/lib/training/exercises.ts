// ── Exercise Utilities ──
// Ported from OIKOS/packages/vivo/src/data/exercise-catalog.ts, adapted for Pulse.

import type { Discipline, MuscleGroup, Tendon, Joint, Exercise } from './types';
import type { Sport } from '../sports';

// ── Discipline Profiles ──
// Maps disciplines to their musculoskeletal impact profiles.

export const DISCIPLINE_PROFILES: Record<
  Discipline,
  {
    muscleEngagement: Partial<Record<MuscleGroup, number>>;
    tendonStress: Partial<Record<Tendon, number>>;
    jointImpact: Partial<Record<Joint, number>>;
  }
> = {
  run: {
    muscleEngagement: {
      quadriceps: 85,
      hamstrings: 75,
      calves: 80,
      glutes: 70,
      core: 40,
    },
    tendonStress: {
      achilles: 80,
      patellar: 70,
      it_band: 65,
      plantar_fascia: 60,
    },
    jointImpact: {
      knees: 75,
      ankles: 70,
      hips: 50,
    },
  },
  bike: {
    muscleEngagement: {
      quadriceps: 90,
      hamstrings: 60,
      calves: 50,
      glutes: 75,
      core: 30,
    },
    tendonStress: {
      patellar: 60,
      it_band: 40,
    },
    jointImpact: {
      knees: 65,
      hips: 40,
      lumbar_spine: 35,
    },
  },
  swim: {
    muscleEngagement: {
      shoulders: 85,
      upper_back: 80,
      core: 70,
      triceps: 65,
      chest: 60,
    },
    tendonStress: {
      rotator_cuff: 80,
      biceps_tendon: 50,
    },
    jointImpact: {
      shoulders: 70,
      elbows: 30,
    },
  },
  strength: {
    muscleEngagement: { core: 50 },
    tendonStress: {},
    jointImpact: {},
  },
  rest: {
    muscleEngagement: {},
    tendonStress: {},
    jointImpact: {},
  },
  other: {
    muscleEngagement: { core: 20 },
    tendonStress: {},
    jointImpact: {},
  },
};

// ── Sport → Discipline Mapping ──

export const SPORT_TO_DISCIPLINE: Record<Sport, Discipline> = {
  crossfit: 'strength',
  yoga: 'other',
  running: 'run',
  trail: 'run',
  boxe: 'strength',
  musculation: 'strength',
  fitness: 'strength',
  pilates: 'other',
  meditation: 'rest',
  natation: 'swim',
  cyclisme: 'bike',
  // Multi-sport: primary discipline is 'run' (most metabolically demanding for injury risk)
  triathlon: 'run',
  duathlon: 'run',
  autre: 'other',
};

// Triathlon: all component disciplines
export const TRIATHLON_DISCIPLINES: Discipline[] = ['swim', 'bike', 'run'];
export const DUATHLON_DISCIPLINES: Discipline[] = ['run', 'bike'];

// Typical triathlon volume distribution (% of total time)
export const TRIATHLON_VOLUME_RATIO: Record<Discipline, number> = {
  swim: 0.15,
  bike: 0.45,
  run: 0.40,
  strength: 0,
  rest: 0,
  other: 0,
};

// Colors per discipline (for UI coding)
export const DISCIPLINE_COLORS: Record<Discipline, { bg: string; text: string; border: string }> = {
  swim: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-300' },
  bike: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  run: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  strength: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
  rest: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  other: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
};

// ── Cardio Sports ──

const CARDIO_SPORTS = new Set<string>(['running', 'trail', 'cyclisme', 'natation', 'triathlon', 'duathlon']);

export function isCardioSport(sport: string): boolean {
  return CARDIO_SPORTS.has(sport);
}

// ── Exercise Filters ──

export function getExercisesByDiscipline(
  exercises: Exercise[],
  discipline: Discipline,
): Exercise[] {
  return exercises.filter((ex) => ex.discipline === discipline);
}

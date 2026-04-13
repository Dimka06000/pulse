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
  autre: 'other',
};

// ── Cardio Sports ──

const CARDIO_SPORTS = new Set<string>(['running', 'trail', 'cyclisme', 'natation']);

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

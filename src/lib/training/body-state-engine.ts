// ── Body State Engine ──
// Pure computation: activity data → body state (muscle load, nervous system, joints)

import type { MuscleGroup, Tendon, Joint } from './types';
import { DISCIPLINE_PROFILES } from './exercises';
import type { Discipline } from './types';

// ── Interfaces ──

export interface MuscleRegionState {
  loadPercent: number;
  status: 'fresh' | 'fatigued' | 'overloaded';
  heatIntensity: number;
  recoveryProgress: number;
}

export interface TendonRegionState {
  stressPercent: number;
  alertLevel: 'normal' | 'warning' | 'danger';
}

export interface JointRegionState {
  impactPercent: number;
  alertLevel: 'normal' | 'warning' | 'danger';
}

export interface BodyState {
  overallState: 'recovered' | 'moderate' | 'fatigued' | 'overtrained';
  nervousSystemState: 'parasympathetic' | 'transitioning' | 'sympathetic';
  nervousSystemIntensity: number;
  readinessScore: number;
  muscleRegions: Record<string, MuscleRegionState>;
  tendonRegions: Record<string, TendonRegionState>;
  jointRegions: Record<string, JointRegionState>;
  recoveryTimeEstimate: number;
}

export interface ActivityInput {
  discipline: string;
  tss: number;
  date: string;
  duration: number;
  rpe?: number;
}

// ── Constants ──

const MUSCLE_HALF_LIFE_HOURS = 48;
const TENDON_HALF_LIFE_HOURS = 72;
const JOINT_HALF_LIFE_HOURS = 72;

const ALL_MUSCLES: MuscleGroup[] = [
  'quadriceps', 'hamstrings', 'calves', 'glutes', 'hip_flexors',
  'core', 'lower_back', 'upper_back', 'chest', 'shoulders',
  'biceps', 'triceps', 'forearms',
];

const ALL_TENDONS: Tendon[] = [
  'achilles', 'patellar', 'it_band', 'plantar_fascia',
  'rotator_cuff', 'biceps_tendon', 'pec_tendon',
];

const ALL_JOINTS: Joint[] = [
  'knees', 'ankles', 'hips', 'shoulders', 'elbows', 'wrists', 'lumbar_spine',
];

// ── Helpers ──

function decayFactor(hoursSince: number, halfLifeHours: number): number {
  return Math.exp(-hoursSince * Math.LN2 / halfLifeHours);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function alertLevel(percent: number): 'normal' | 'warning' | 'danger' {
  if (percent >= 80) return 'danger';
  if (percent >= 50) return 'warning';
  return 'normal';
}

function muscleStatus(loadPercent: number): 'fresh' | 'fatigued' | 'overloaded' {
  if (loadPercent >= 85) return 'overloaded';
  if (loadPercent >= 30) return 'fatigued';
  return 'fresh';
}

// ── Main Function ──

export function computeBodyState(params: {
  activities: ActivityInput[];
  currentMetrics: { ctl: number; atl: number; tsb: number };
}): BodyState {
  const { activities, currentMetrics } = params;
  const { tsb } = currentMetrics;
  const now = Date.now();

  // Overall state from TSB
  let overallState: BodyState['overallState'];
  let nervousSystemState: BodyState['nervousSystemState'];
  let nervousSystemIntensity: number;

  if (tsb < -30) {
    overallState = 'overtrained';
    nervousSystemState = 'sympathetic';
    nervousSystemIntensity = 100;
  } else if (tsb < -10) {
    overallState = 'fatigued';
    nervousSystemState = 'sympathetic';
    // Proportional: -30→100%, -10→30%
    nervousSystemIntensity = clamp(30 + ((-10 - tsb) / 20) * 70, 30, 100);
  } else if (tsb <= 5) {
    overallState = 'moderate';
    nervousSystemState = 'transitioning';
    // -10→30%, 5→10%
    nervousSystemIntensity = clamp(10 + ((5 - tsb) / 15) * 20, 10, 30);
  } else {
    overallState = 'recovered';
    nervousSystemState = 'parasympathetic';
    nervousSystemIntensity = clamp(10 - (tsb - 5) * 0.5, 0, 10);
  }

  // Readiness score
  const recoveryTimeEstimate = tsb < 0 ? Math.ceil(Math.abs(tsb) * 2.5) : 0;
  const readinessScore = clamp(Math.round(50 + tsb * 2 - recoveryTimeEstimate * 0.1), 0, 100);

  // Compute per-muscle load from recent activities
  const muscleAccum: Record<string, number> = {};
  ALL_MUSCLES.forEach(m => { muscleAccum[m] = 0; });

  const tendonAccum: Record<string, number> = {};
  ALL_TENDONS.forEach(t => { tendonAccum[t] = 0; });

  const jointAccum: Record<string, number> = {};
  ALL_JOINTS.forEach(j => { jointAccum[j] = 0; });

  for (const act of activities) {
    const disc = act.discipline as Discipline;
    const profile = DISCIPLINE_PROFILES[disc];
    if (!profile) continue;

    const actDate = new Date(act.date).getTime();
    const hoursSince = Math.max(0, (now - actDate) / (1000 * 60 * 60));
    const tss = act.tss || (act.duration * (act.rpe || 5) / 5); // fallback TSS

    // Muscles
    for (const [muscle, engagement] of Object.entries(profile.muscleEngagement)) {
      const decay = decayFactor(hoursSince, MUSCLE_HALF_LIFE_HOURS);
      muscleAccum[muscle] = (muscleAccum[muscle] || 0) + (tss * (engagement as number) / 100) * decay;
    }

    // Tendons
    for (const [tendon, stress] of Object.entries(profile.tendonStress)) {
      const decay = decayFactor(hoursSince, TENDON_HALF_LIFE_HOURS);
      tendonAccum[tendon] = (tendonAccum[tendon] || 0) + (tss * (stress as number) / 100) * decay;
    }

    // Joints
    for (const [joint, impact] of Object.entries(profile.jointImpact)) {
      const decay = decayFactor(hoursSince, JOINT_HALF_LIFE_HOURS);
      jointAccum[joint] = (jointAccum[joint] || 0) + (tss * (impact as number) / 100) * decay;
    }
  }

  // Normalize to 0-100 (a single hard session ~100 TSS with 85% engagement ≈ 85 raw)
  const maxMuscleLoad = 120; // normalization factor
  const maxTendonLoad = 100;
  const maxJointLoad = 100;

  const muscleRegions: Record<string, MuscleRegionState> = {};
  for (const muscle of ALL_MUSCLES) {
    const loadPercent = clamp(Math.round((muscleAccum[muscle] / maxMuscleLoad) * 100), 0, 100);
    const status = muscleStatus(loadPercent);
    muscleRegions[muscle] = {
      loadPercent,
      status,
      heatIntensity: loadPercent / 100,
      recoveryProgress: status === 'fresh' ? 1 : clamp(1 - loadPercent / 100, 0, 1),
    };
  }

  const tendonRegions: Record<string, TendonRegionState> = {};
  for (const tendon of ALL_TENDONS) {
    const stressPercent = clamp(Math.round((tendonAccum[tendon] / maxTendonLoad) * 100), 0, 100);
    tendonRegions[tendon] = { stressPercent, alertLevel: alertLevel(stressPercent) };
  }

  const jointRegions: Record<string, JointRegionState> = {};
  for (const joint of ALL_JOINTS) {
    const impactPercent = clamp(Math.round((jointAccum[joint] / maxJointLoad) * 100), 0, 100);
    jointRegions[joint] = { impactPercent, alertLevel: alertLevel(impactPercent) };
  }

  return {
    overallState,
    nervousSystemState,
    nervousSystemIntensity: Math.round(nervousSystemIntensity),
    readinessScore,
    muscleRegions,
    tendonRegions,
    jointRegions,
    recoveryTimeEstimate,
  };
}

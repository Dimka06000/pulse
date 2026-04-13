// ── Training Types ──
// Ported from OIKOS/packages/vivo/src/types/training.ts, adapted for Pulse.

export type Discipline = 'swim' | 'bike' | 'run' | 'strength' | 'rest' | 'other';

export type TrainingPhase = 'base' | 'build' | 'peak' | 'taper' | 'race' | 'recovery';

export type HRZone = 'z1' | 'z2' | 'z3' | 'z4' | 'z5';

export type MuscleGroup =
  | 'quadriceps' | 'hamstrings' | 'calves' | 'glutes' | 'hip_flexors'
  | 'core' | 'lower_back' | 'upper_back' | 'chest' | 'shoulders'
  | 'biceps' | 'triceps' | 'forearms';

export type Tendon =
  | 'achilles' | 'patellar' | 'rotator_cuff' | 'it_band' | 'plantar_fascia'
  | 'biceps_tendon' | 'pec_tendon';

export type Joint =
  | 'knees' | 'ankles' | 'hips' | 'shoulders' | 'elbows' | 'wrists' | 'lumbar_spine';

// NEW — not in VIVO
export type CyclePhase = 'menstruation' | 'follicular' | 'ovulation' | 'luteal';

// ── Interfaces ──

export interface Activity {
  id: string;
  userId: string;
  discipline: Discipline;
  name: string;
  date: string;
  duration: number;
  distance?: number;
  calories?: number;
  avgHR?: number;
  maxHR?: number;
  avgPower?: number;
  avgPace?: string;
  tss?: number;
  notes?: string;
  sufferScore?: number;
  rpe?: number; // 1-10
  estimatedTss?: number;
}

export interface LoadMetrics {
  ctl: number;
  atl: number;
  tsb: number;
}

export interface LoadHistory {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

export interface RecoveryScore {
  score: number;
  status: 'ready' | 'moderate' | 'fatigued' | 'rest';
  factors: {
    hrv: number;
    sleepScore: number;
    trainingLoad: number;
  };
}

export interface MuscleLoad {
  muscleGroup: MuscleGroup;
  loadPercent: number;
  recoveryHoursRemaining: number;
  status: 'fresh' | 'fatigued' | 'overloaded';
  lastSolicitation?: { activityName: string; date: string };
}

export interface TendonJointStatus {
  name: Tendon | Joint;
  type: 'tendon' | 'joint';
  stressPercent: number;
  cumulativeLoad: number;
  alertLevel: 'normal' | 'warning' | 'danger';
}

export interface Exercise {
  id: string;
  name: string;
  nameEn: string;
  discipline: Discipline;
  category: 'compound' | 'isolation' | 'cardio' | 'flexibility';
  muscleEngagement: Partial<Record<MuscleGroup, number>>;
  tendonStress: Partial<Record<Tendon, number>>;
  jointImpact: Partial<Record<Joint, number>>;
  defaultDuration?: number;
  defaultRPE?: number;
}

export interface PhaseDef {
  phase: TrainingPhase;
  startWeek: number;
  endWeek: number;
  weeklyVolumeMin: number;
  weeklyTSS: number;
}

export interface WeeklyTarget {
  id: string;
  planId: string;
  weekNumber: number;
  year: number;
  phase: TrainingPhase;
  targetVolumeMin: number;
  targetTss: number;
  actualVolumeMin?: number;
  actualTss?: number;
  notes?: string;
}

export interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  message: string;
  category: 'recovery' | 'volume' | 'intensity' | 'nutrition';
}

export interface LimitingFactor {
  id: string;
  source: 'biomarker' | 'genetics' | 'medical';
  name: string;
  value?: string;
  impact: string;
  severity: 'high' | 'moderate' | 'low';
  mechanism?: string;
  action?: string;
  sourceRef: string;
}

export interface MedicalConstraint {
  id: string;
  type: 'fracture' | 'restriction' | 'weakness';
  bodyArea: string;
  severity: 'mild' | 'moderate' | 'severe';
  notes?: string;
  date?: string;
  active: boolean;
}

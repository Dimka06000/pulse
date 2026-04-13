import type { CyclePhase } from './types';

export interface CycleInfo {
  phase: CyclePhase;
  dayInCycle: number;
  intensityModifier: number;
  recommendations: string[];
  aclWarning: boolean;
}

export function getCyclePhase(
  lastPeriodDate: string,
  avgCycleDays: number,
  avgPeriodDays: number,
  targetDate: string
): CycleInfo {
  const last = new Date(lastPeriodDate);
  const target = new Date(targetDate);
  const diffMs = target.getTime() - last.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const dayInCycle = ((diffDays % avgCycleDays) + avgCycleDays) % avgCycleDays;

  if (dayInCycle < avgPeriodDays) {
    return {
      phase: 'menstruation',
      dayInCycle,
      intensityModifier: 0.9,
      recommendations: ['Adapter l\'intensité si inconfort', 'Privilégier la mobilité et le yoga'],
      aclWarning: false,
    };
  }
  if (dayInCycle < 13) {
    return {
      phase: 'follicular',
      dayInCycle,
      intensityModifier: 1.0,
      recommendations: ['Fenêtre optimale pour la force et le HIIT', 'Meilleure récupération — profitez-en pour pousser'],
      aclWarning: false,
    };
  }
  if (dayInCycle < 16) {
    return {
      phase: 'ovulation',
      dayInCycle,
      intensityModifier: 1.0,
      recommendations: ['Pic de puissance', 'Attention risque ACL accru sur pliométrie et changements de direction'],
      aclWarning: true,
    };
  }
  return {
    phase: 'luteal',
    dayInCycle,
    intensityModifier: 0.85,
    recommendations: ['Réduire l\'intensité de 15%', 'Favoriser l\'endurance à basse intensité', 'Augmenter l\'hydratation'],
    aclWarning: false,
  };
}

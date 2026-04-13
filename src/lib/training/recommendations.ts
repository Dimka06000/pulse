import type { Recommendation, TrainingPhase } from './types';

export interface RecommendationContext {
  ctl: number;
  atl: number;
  tsb: number;
  currentPhase?: TrainingPhase;
  weekInPhase?: number;
  daysSinceLastActivity?: number;
}

export function generateRecommendations(ctx: RecommendationContext): Recommendation[] {
  const recs: Recommendation[] = [];
  if (ctx.tsb < -30) {
    recs.push({ id: 'overtraining-risk', priority: 'high', message: 'Risque de surentraînement — réduis la charge cette semaine', category: 'recovery' });
  } else if (ctx.tsb < -20) {
    recs.push({ id: 'recovery-needed', priority: 'high', message: 'Forme très basse — journée récup recommandée', category: 'recovery' });
  }
  if (ctx.ctl > 0 && ctx.atl > ctx.ctl * 1.5) {
    recs.push({ id: 'acute-chronic-high', priority: 'high', message: 'Charge aiguë très élevée vs fitness — risque de blessure', category: 'intensity' });
  }
  if (ctx.weekInPhase === 3 && (ctx.currentPhase === 'build' || ctx.currentPhase === 'peak')) {
    recs.push({ id: 'deload-week', priority: 'medium', message: 'Semaine de décharge recommandée (60-70% du volume)', category: 'volume' });
  }
  if (ctx.tsb > 15 && ctx.currentPhase && ctx.currentPhase !== 'recovery') {
    recs.push({ id: 'peak-form', priority: 'low', message: 'Pic de forme — bon moment pour un test ou une course', category: 'intensity' });
  }
  if (ctx.daysSinceLastActivity != null && ctx.daysSinceLastActivity >= 3 && ctx.currentPhase !== 'taper' && ctx.currentPhase !== 'recovery') {
    recs.push({ id: 'inactivity', priority: 'medium', message: `Pas d'activité depuis ${ctx.daysSinceLastActivity} jours`, category: 'volume' });
  }
  return recs;
}

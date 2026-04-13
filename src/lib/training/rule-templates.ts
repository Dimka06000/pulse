// ─── Rule Templates ────────────────────────────────────────────────────────

export interface RuleTemplate {
  title: string;
  trigger: string;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
}

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    title: 'Échauffement avant chaque séance de force',
    trigger: 'before_session',
    condition: { session_type: 'strength' },
    action: { type: 'insert_routine', routine_id: '', routine_title: '' },
  },
  {
    title: 'Deload toutes les 4 semaines',
    trigger: 'every_nth_week',
    condition: { every_n: 4 },
    action: { type: 'reduce_intensity', percent: 40 },
  },
  {
    title: 'Alerte fatigue',
    trigger: 'tsb_threshold',
    condition: { threshold: -20 },
    action: { type: 'alert', message: 'Fatigue élevée — envisagez un jour de repos' },
  },
  {
    title: 'Adaptation phase lutéale',
    trigger: 'cycle_phase',
    condition: { phase: 'luteal' },
    action: { type: 'reduce_intensity', percent: 15 },
  },
  {
    title: 'Récupération post-compétition',
    trigger: 'after_race',
    condition: {},
    action: { type: 'swap_session', replacement: 'Récupération active' },
  },
];

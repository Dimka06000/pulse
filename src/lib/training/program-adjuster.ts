// ── AI Program Adjuster — Planned vs Actual analysis ──

import Anthropic from '@anthropic-ai/sdk';

export interface AdjustmentInput {
  programId: string;
  sport: string;
  plannedWorkouts: {
    weekNumber: number;
    dayNumber: number;
    title: string;
    durationMinutes: number;
    intensityPercent: number;
  }[];
  completedSessions: {
    date: string;
    sport: string;
    durationMinutes: number;
    rpe?: number;
    notes?: string;
  }[];
  currentMetrics: { ctl: number; atl: number; tsb: number };
  currentWeek: number;
}

export interface Adjustment {
  type: 'modify' | 'add' | 'remove' | 'alert';
  weekNumber: number;
  dayNumber: number;
  reason: string;
  changes?: {
    title?: string;
    durationMinutes?: number;
    intensityPercent?: number;
  };
}

const SYSTEM_PROMPT = `Tu es un coach sportif expert en périodisation et analyse de charge d'entraînement.
Tu analyses l'écart entre un programme prévu et les séances réellement réalisées par l'athlète.

En fonction de cet écart et des métriques de charge (CTL/ATL/TSB), tu proposes des ajustements concrets pour les prochaines semaines.

Règles d'analyse :
- Si TSB < -20 : l'athlète est fatigué → réduire volume/intensité
- Si TSB > 15 : l'athlète est en forme → possibilité d'augmenter légèrement
- Sessions manquées : rattraper progressivement, ne jamais doubler le volume
- Sessions sur-performées : vérifier que ça ne mène pas au surentraînement
- Sessions sous-performées : réduire l'intensité des prochaines séances
- Maximum 8 ajustements par analyse
- Chaque ajustement doit avoir une raison claire en français

Réponds UNIQUEMENT avec un array JSON au format :
[{ "type": "modify|add|remove|alert", "weekNumber": 1, "dayNumber": 1, "reason": "...", "changes": { "title": "...", "durationMinutes": 60, "intensityPercent": 70 } }]

Le champ "changes" est obligatoire pour "modify" et "add", absent pour "remove" et "alert".`;

function buildAnalysisPrompt(input: AdjustmentInput): string {
  const parts: string[] = [];

  parts.push(`## Sport : ${input.sport}`);
  parts.push(`## Semaine actuelle : ${input.currentWeek}`);

  parts.push(`## Métriques de charge actuelles
- CTL (fitness) : ${input.currentMetrics.ctl}
- ATL (fatigue) : ${input.currentMetrics.atl}
- TSB (forme) : ${input.currentMetrics.tsb}`);

  // Show planned workouts for current and next 2 weeks
  const relevantPlanned = input.plannedWorkouts.filter(
    (w) => w.weekNumber >= input.currentWeek - 1 && w.weekNumber <= input.currentWeek + 2
  );
  parts.push(`## Séances prévues (semaines ${input.currentWeek - 1} à ${input.currentWeek + 2})
${relevantPlanned.map((w) => `- S${w.weekNumber} J${w.dayNumber}: ${w.title} (${w.durationMinutes}min, intensité ${w.intensityPercent}%)`).join('\n')}`);

  // Show completed sessions
  if (input.completedSessions.length > 0) {
    parts.push(`## Séances réalisées (14 derniers jours)
${input.completedSessions.map((s) => `- ${s.date}: ${s.sport} — ${s.durationMinutes}min${s.rpe ? ` (RPE ${s.rpe})` : ''}${s.notes ? ` — ${s.notes}` : ''}`).join('\n')}`);
  } else {
    parts.push('## Séances réalisées\nAucune séance enregistrée sur les 14 derniers jours.');
  }

  // Calculate basic deltas
  const totalPlannedMin = relevantPlanned
    .filter((w) => w.weekNumber <= input.currentWeek)
    .reduce((sum, w) => sum + w.durationMinutes, 0);
  const totalCompletedMin = input.completedSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const missedCount = relevantPlanned.filter((w) => w.weekNumber < input.currentWeek).length - input.completedSessions.length;

  parts.push(`## Résumé des écarts
- Volume prévu : ${totalPlannedMin} min
- Volume réalisé : ${totalCompletedMin} min
- Delta : ${totalCompletedMin - totalPlannedMin} min (${totalPlannedMin > 0 ? Math.round(((totalCompletedMin - totalPlannedMin) / totalPlannedMin) * 100) : 0}%)
- Séances potentiellement manquées : ${Math.max(0, missedCount)}`);

  parts.push('Propose des ajustements pour les semaines à venir au format JSON.');

  return parts.join('\n\n');
}

export async function analyzeAndAdjust(input: AdjustmentInput): Promise<Adjustment[]> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userPrompt = buildAnalysisPrompt(input);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: userPrompt }],
    system: SYSTEM_PROMPT,
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const rawContent = textBlock?.text ?? '[]';

  // Strip markdown fences if present
  const jsonStr = rawContent
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed: unknown[] = JSON.parse(jsonStr);

  // Validate and filter
  const adjustments: Adjustment[] = (parsed as Adjustment[]).filter(
    (a) =>
      ['modify', 'add', 'remove', 'alert'].includes(a.type) &&
      typeof a.weekNumber === 'number' &&
      typeof a.dayNumber === 'number' &&
      typeof a.reason === 'string'
  );

  return adjustments.slice(0, 8);
}

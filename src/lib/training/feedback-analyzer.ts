// ── AI Feedback Analyzer — Planned vs Actual ──

import Anthropic from '@anthropic-ai/sdk';
import type { Recommendation } from './types';

export interface PlannedVsActual {
  weekNumber: number;
  planned: { title: string; durationMinutes: number; intensityPercent: number; exercises: string[] }[];
  actual: { title: string; durationMinutes: number; sport: string; tss?: number; rpe?: number }[];
}

export interface FeedbackResult {
  summary: string;
  adherence: number;
  adjustments: Adjustment[];
  recommendations: Recommendation[];
}

export interface Adjustment {
  weekNumber: number;
  dayNumber: number;
  type: 'increase_intensity' | 'decrease_intensity' | 'add_recovery' | 'redistribute' | 'skip';
  description: string;
  intensityChange?: number;
}

const SYSTEM_PROMPT = `Tu es un coach sportif expert. Analyse la semaine d'entraînement (prévu vs réalisé) et propose des ajustements pour la semaine suivante.

Règles:
- Compare le nombre de séances prévues vs réalisées
- Évalue l'intensité et le volume réellement effectués
- Prends en compte le TSB (Training Stress Balance) actuel
- Adapte au niveau de l'athlète
- Propose des ajustements concrets pour la semaine suivante
- Sois bienveillant mais honnête

Réponds UNIQUEMENT avec un objet JSON au format:
{
  "summary": "Résumé en français de la semaine (2-3 phrases)",
  "adherence": 75,
  "adjustments": [
    {
      "weekNumber": 2,
      "dayNumber": 1,
      "type": "decrease_intensity",
      "description": "Réduire l'intensité de 10% pour permettre la récupération",
      "intensityChange": -10
    }
  ],
  "recommendations": [
    {
      "id": "rec-1",
      "priority": "high",
      "message": "Ajouter une séance de mobilité en fin de semaine",
      "category": "recovery"
    }
  ]
}`;

export async function analyzeWeekFeedback(
  planned: PlannedVsActual,
  currentMetrics: { ctl: number; atl: number; tsb: number },
  athleteLevel: string,
): Promise<FeedbackResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Calculate basic adherence before AI call
  const plannedCount = planned.planned.length;
  const actualCount = planned.actual.length;
  const rawAdherence = plannedCount > 0 ? Math.round((actualCount / plannedCount) * 100) : 0;

  const userPrompt = `## Semaine ${planned.weekNumber}

### Séances prévues (${plannedCount})
${planned.planned.map((p, i) => `${i + 1}. ${p.title} — ${p.durationMinutes} min, intensité ${p.intensityPercent}%, exercices: ${p.exercises.join(', ') || 'N/A'}`).join('\n')}

### Séances réalisées (${actualCount})
${planned.actual.length > 0
    ? planned.actual.map((a, i) => `${i + 1}. ${a.title} — ${a.durationMinutes} min, sport: ${a.sport}${a.tss != null ? `, TSS: ${a.tss}` : ''}${a.rpe != null ? `, RPE: ${a.rpe}` : ''}`).join('\n')
    : 'Aucune séance enregistrée'}

### Métriques actuelles
- CTL (fitness): ${currentMetrics.ctl}
- ATL (fatigue): ${currentMetrics.atl}
- TSB (forme): ${currentMetrics.tsb}

### Niveau athlète: ${athleteLevel}

### Adhérence brute: ${rawAdherence}%

Analyse cette semaine et propose des ajustements pour la semaine ${planned.weekNumber + 1}.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const rawContent = textBlock?.text ?? '';

  // Strip markdown fences if present
  const jsonStr = rawContent
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(jsonStr) as FeedbackResult;

    // Ensure adherence is bounded
    parsed.adherence = Math.max(0, Math.min(100, parsed.adherence ?? rawAdherence));

    // Ensure arrays exist
    parsed.adjustments = parsed.adjustments ?? [];
    parsed.recommendations = parsed.recommendations ?? [];

    return parsed;
  } catch {
    // Fallback if AI response isn't valid JSON
    return {
      summary: `Semaine ${planned.weekNumber}: ${actualCount}/${plannedCount} séances réalisées (${rawAdherence}% d'adhérence).`,
      adherence: rawAdherence,
      adjustments: [],
      recommendations: [],
    };
  }
}

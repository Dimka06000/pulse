// ── AI Program Generator — Claude Sonnet ──

import Anthropic from '@anthropic-ai/sdk';
import type { ScrapedEvent } from './event-scraper';
import { searchTrainingEvidence, type PubMedResult } from './pubmed-search';

export interface GenerationInput {
  event: ScrapedEvent | null;
  sport: string;
  durationWeeks: number;
  athleteLevel: 'beginner' | 'intermediate' | 'advanced';
  blocks: { phase: string; weekStart: number; weekEnd: number; focus: string }[];
  exerciseCatalog: { name: string; sport: string; category: string }[];
  athleteProfile?: {
    currentVolumeMinPerWeek?: number;
    injuries?: string[];
  };
}

export interface GeneratedWorkout {
  weekNumber: number;
  dayNumber: number;
  title: string;
  description: string;
  durationMinutes: number;
  exercises: {
    name: string;
    sets?: number;
    reps?: number;
    rest_seconds?: number;
    duration_minutes?: number;
  }[];
  intensityPercent: number;
}

const SYSTEM_PROMPT = `Tu es un coach sportif expert en périodisation et programmation d'entraînement.
Génère un programme d'entraînement complet sous forme de JSON.

Règles:
- Chaque semaine a 4-6 séances max (2-3 jours de repos)
- Respecte les phases de périodisation fournies (volume/intensité par phase)
- Utilise UNIQUEMENT les exercices du catalogue fourni
- Adapte au niveau de l'athlète
- Inclus échauffement implicite dans la durée
- Varie les exercices d'une semaine à l'autre
- Les séances de récupération sont légères (mobilité, yoga, marche)
- Intensité en % (60-100) selon la phase et la semaine

Réponds UNIQUEMENT avec un array JSON de workouts au format:
[{ "weekNumber": 1, "dayNumber": 1, "title": "...", "description": "...", "durationMinutes": 60, "exercises": [{ "name": "...", "sets": 3, "reps": 10, "rest_seconds": 60 }], "intensityPercent": 70 }]`;

function buildUserPrompt(input: GenerationInput): string {
  const parts: string[] = [];

  if (input.event) {
    parts.push(`## Événement cible
- Nom: ${input.event.name}
- Date: ${input.event.date ?? 'Non spécifiée'}
- Sport: ${input.event.sport}
- Distance: ${input.event.distanceKm ? `${input.event.distanceKm} km` : 'N/A'}
- Dénivelé: ${input.event.elevationM ? `${input.event.elevationM} m` : 'N/A'}
- Terrain: ${input.event.terrainType ?? 'N/A'}
- Conditions: ${input.event.conditions || 'N/A'}
- Description: ${input.event.description || 'N/A'}`);
  }

  parts.push(`## Paramètres du programme
- Sport: ${input.sport}
- Durée: ${input.durationWeeks} semaines
- Niveau: ${input.athleteLevel}`);

  parts.push(`## Blocs de périodisation
${input.blocks.map((b) => `- Semaines ${b.weekStart}-${b.weekEnd}: ${b.phase} (focus: ${b.focus})`).join('\n')}`);

  parts.push(`## Catalogue d'exercices disponibles
${input.exerciseCatalog.map((e) => `- ${e.name} (${e.sport}, ${e.category})`).join('\n')}`);

  if (input.athleteProfile) {
    const profile = input.athleteProfile;
    const profileLines: string[] = [];
    if (profile.currentVolumeMinPerWeek) {
      profileLines.push(`- Volume actuel: ${profile.currentVolumeMinPerWeek} min/semaine`);
    }
    if (profile.injuries?.length) {
      profileLines.push(`- Blessures/limitations: ${profile.injuries.join(', ')}`);
    }
    if (profileLines.length) {
      parts.push(`## Profil athlète\n${profileLines.join('\n')}`);
    }
  }

  return parts.join('\n\n');
}

function buildEvidenceSection(evidence: PubMedResult[]): string {
  if (evidence.length === 0) return '';
  const lines = evidence.map((e) => {
    const citation = [e.authors, e.year].filter(Boolean).join(', ');
    const snippet = e.abstract ? ` ${e.abstract}` : '';
    return `- ${e.title} (${citation} — ${e.journal}):${snippet}`;
  });
  return `\n\n## Recherche scientifique pertinente\n${lines.join('\n')}\nBase le programme sur ces données probantes quand c'est pertinent.`;
}

export async function generateProgram(input: GenerationInput): Promise<GeneratedWorkout[]> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Enrich prompt with PubMed evidence (non-blocking — fails silently)
  const goal = input.event?.name ?? 'general fitness';
  const evidence = await searchTrainingEvidence(input.sport, goal).catch(() => []);

  const userPrompt = buildUserPrompt(input) + buildEvidenceSection(evidence);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      { role: 'user', content: userPrompt },
    ],
    system: SYSTEM_PROMPT,
  });

  // Extract text content
  const textBlock = response.content.find((b) => b.type === 'text');
  const rawContent = textBlock?.text ?? '';

  // Strip markdown fences if present
  const jsonStr = rawContent
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed: unknown[] = JSON.parse(jsonStr);

  // Validate and filter
  const workouts: GeneratedWorkout[] = (parsed as GeneratedWorkout[]).filter(
    (w) =>
      w.weekNumber >= 1 &&
      w.weekNumber <= input.durationWeeks &&
      w.dayNumber >= 1 &&
      w.dayNumber <= 7,
  );

  return workouts;
}

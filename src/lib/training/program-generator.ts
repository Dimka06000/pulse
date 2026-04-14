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
  discipline?: string; // 'swim' | 'bike' | 'run' | 'strength' | 'rest' | 'other'
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
[{ "weekNumber": 1, "dayNumber": 1, "title": "...", "description": "...", "durationMinutes": 60, "discipline": "run", "exercises": [{ "name": "...", "sets": 3, "reps": 10, "rest_seconds": 60 }], "intensityPercent": 70 }]`;

const TRIATHLON_SYSTEM_PROMPT = `Tu es un coach triathlon expert en périodisation et programmation d'entraînement multisport.
Génère un programme triathlon complet sous forme de JSON.

Règles triathlon:
- Distribution volumique typique: 15% natation, 45% vélo, 40% course à pied (par durée)
- Inclure 1-2 séances "brick" par semaine (vélo suivi de course, sans pause)
- Inclure des séances de pratique de transition (T1: natation→vélo, T2: vélo→course)
- Phase base: volume élevé, intensité modérée. Surtout aérobique (z2)
- Phase build: intervalles spécifiques par discipline, 1 brick/semaine
- Phase peak: simulation de course, brick long, travail au seuil
- Phase taper: réduction volume -40%, maintenir intensité. La natation diminue moins que la course
- Chaque semaine a 6-9 séances (3 disciplines + transitions + récupération)
- Repos: 1-2 jours par semaine
- Adapte au niveau: débutant (sprint/olympique), intermédiaire (olympique/70.3), avancé (70.3/Ironman)

Pour chaque workout, inclure le champ "discipline": "swim" | "bike" | "run" | "strength" | "rest" | "other"
Les séances brick utilisent "discipline": "bike" (partie principale) et le titre indique "Brick"

Réponds UNIQUEMENT avec un array JSON de workouts au format:
[{ "weekNumber": 1, "dayNumber": 1, "title": "...", "description": "...", "durationMinutes": 60, "discipline": "run", "exercises": [{ "name": "...", "sets": 3, "reps": 10, "rest_seconds": 60 }], "intensityPercent": 70 }]`;

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

  const isTriathlonSport = input.sport === 'triathlon' || input.sport === 'duathlon';
  const systemPrompt = isTriathlonSport ? TRIATHLON_SYSTEM_PROMPT : SYSTEM_PROMPT;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      { role: 'user', content: userPrompt },
    ],
    system: systemPrompt,
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

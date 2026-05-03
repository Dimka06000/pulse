# Program Builder — Plan 4: Event Scraping + AI Program Generation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let coaches search for a target event (marathon, triathlon, Spartan Race...), scrape event details + experience reports from the web, and generate a complete program skeleton with sessions pre-filled based on the event, athlete profile, and periodization.

**Architecture:** Tavily API for web search, Perplexity API for experience reports synthesis, Claude API for program generation. New event search modal UI + enhanced program wizard with event step.

**Tech Stack:** Tavily API, Perplexity API, Anthropic SDK (Claude), Next.js API routes, React

**Spec:** `docs/superpowers/specs/2026-04-13-program-builder-design.md`

---

### Task 1: Add API keys to .env.local

**Files:**
- Modify: `.env.local`

- [ ] Check if Tavily and Perplexity API keys exist in Dimitri's global Claude settings or .env.local. Add them:

```
TAVILY_API_KEY=...
PERPLEXITY_API_KEY=...
```

Tavily: available from global settings (Dimitri has it).
Perplexity: available from global settings.

Also ensure ANTHROPIC_API_KEY is in .env.local (needed for Claude-based program generation). If not, add from Vercel env vars.

- [ ] Commit: no commit (env file is gitignored)

---

### Task 2: Event scraping service

**Files:**
- Create: `src/lib/training/event-scraper.ts`
- Create: `__tests__/lib/event-scraper.test.ts`

A service that searches for event info using Tavily and Perplexity.

```typescript
export interface ScrapedEvent {
  name: string;
  date: string | null;
  sport: string;
  location: string;
  distanceKm: number | null;
  elevationM: number | null;
  terrainType: 'road' | 'trail' | 'mixed' | 'indoor' | 'water' | null;
  description: string;
  conditions: string;
  experienceReports: string[];
  sourceUrls: string[];
}

export async function scrapeEvent(query: string): Promise<ScrapedEvent>
```

Implementation:
1. Call Tavily search API (`POST https://api.tavily.com/search`) with query + `search_depth: 'advanced'`
2. Extract structured data from Tavily results: name, date, distance, elevation, location, terrain
3. Call Perplexity API (`POST https://api.perplexity.ai/chat/completions` with model `sonar`) asking for experience reports and race conditions for the event
4. Combine results into ScrapedEvent
5. Return sourceUrls from both sources

Test: mock fetch to verify parsing logic (don't make real API calls in tests). Test that missing fields default to null.

---

### Task 3: Event scrape API endpoint

**Files:**
- Create: `src/app/api/programs/[id]/scrape-event/route.ts`

POST endpoint:
- Input: `{ query: string }` or `{ url: string }`
- Auth required (coach)
- Calls `scrapeEvent()` from Task 2
- Upserts into `target_events` table (delete existing for this program, insert new)
- Updates `training_programs.target_event_id`
- Returns the scraped event data

---

### Task 4: AI program generator service

**Files:**
- Create: `src/lib/training/program-generator.ts`

A service that generates a complete program with workouts using Claude API.

```typescript
export interface GenerationInput {
  event: ScrapedEvent | null;
  sport: string;
  durationWeeks: number;
  athleteLevel: 'beginner' | 'intermediate' | 'advanced';
  blocks: GeneratedBlock[];
  exerciseCatalog: { name: string; sport: string; category: string }[];
  athleteProfile?: {
    currentVolumeMinPerWeek?: number;
    injuries?: string[];
    cycleTracking?: boolean;
  };
}

export interface GeneratedWorkout {
  weekNumber: number;
  dayNumber: number;
  title: string;
  description: string;
  durationMinutes: number;
  exercises: { name: string; sets?: number; reps?: number; rest_seconds?: number; duration_minutes?: number }[];
  intensityPercent: number;
}

export async function generateProgram(input: GenerationInput): Promise<GeneratedWorkout[]>
```

Implementation:
1. Build a Claude prompt with: event context, sport, duration, blocks/phases, athlete profile, exercise catalog
2. System prompt: "Tu es un coach sportif expert en périodisation. Génère un programme d'entraînement structuré."
3. User prompt: structured description of what's needed — which exercises per phase, intensity curves, recovery days
4. Call Anthropic API (claude-sonnet-4-6 for speed) with structured output (JSON mode)
5. Parse the response into GeneratedWorkout[]
6. Validate: check week/day numbers are within range, exercises exist in catalog

Use `@anthropic-ai/sdk` if installed, otherwise use fetch to the Anthropic API directly.

---

### Task 5: Program generation API endpoint

**Files:**
- Create: `src/app/api/programs/[id]/generate/route.ts`

POST endpoint:
- Auth required (coach)
- Input: `{ athleteLevel, athleteProfile? }`
- Fetches: program data, blocks, target event, exercise catalog from DB
- Calls `generateProgram()` from Task 4
- Deletes existing program_workouts (clean slate)
- Inserts all generated workouts into program_workouts table
- Returns count of generated workouts

---

### Task 6: Event search modal

**Files:**
- Create: `src/components/coach/event-search-modal.tsx`

Modal for searching and selecting a target event. Single-page modal.

```typescript
interface EventSearchModalProps {
  open: boolean;
  onClose: () => void;
  onEventSelected: (event: ScrapedEvent) => void;
  programId: string;
}
```

UI:
- Search input: "Marathon de Paris 2027" or paste URL
- "Rechercher" button → calls POST /api/programs/[id]/scrape-event
- Loading state with spinner + "Recherche en cours..."
- Results display: card with event name, date, distance, elevation, terrain, location
- Description and conditions in expandable section
- Experience reports in a scrollable list
- Source URLs as small links
- "Utiliser cet événement" confirm button
- Error state if scraping fails

Modal pattern: same as routine-editor-modal (fixed inset-0, backdrop, role="dialog", Escape key).

---

### Task 7: Enhance program wizard with event step

**Files:**
- Modify: `src/components/coach/program-wizard-modal.tsx`

Add a new step 2 (shift existing steps) in the program creation wizard:

**Current steps:** Sport & Infos → Durée & Tarif → Preview
**New steps:** Sport & Infos → Événement cible (optional) → Durée & Tarif → Preview

Step 2 "Événement cible":
- "Avez-vous un événement cible ?" toggle (oui/non)
- If oui: inline event search (same UI as event-search-modal but embedded)
- If event found: auto-fill duration (weeks between now and event date)
- "Passer" button to skip this step
- Save event data in form state

On program creation (when wizard submits):
1. Create program via POST /api/programs
2. If event selected: POST /api/programs/[id]/scrape-event with event data
3. Auto-periodize: POST /api/programs/[id]/periodize
4. Optionally: POST /api/programs/[id]/generate to pre-fill workouts

---

### Task 8: Add "Générer le programme" button to program detail page

**Files:**
- Modify: `src/app/(app)/coach/programs/[id]/page.tsx`

Add a "Générer avec l'IA" button in the header actions (next to Auto-périodiser):
- Opens a small confirmation modal/popover: "Niveau de l'athlète?" (3 pill buttons: beginner/intermediate/advanced)
- On confirm: calls POST /api/programs/[id]/generate
- Loading state with progress message "Génération en cours..."
- On success: refresh workouts, toast "Programme généré — X séances créées"
- On error: toast with error message

---

### Task 9: Build + push

- Full build: `npx next build`
- Push all commits
- Add Tavily + Perplexity API keys to Vercel env vars if not already there

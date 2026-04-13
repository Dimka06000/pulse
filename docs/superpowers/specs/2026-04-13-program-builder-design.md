# Program Builder V1 — Design Spec

## Context

Pulse is a fitness coaching marketplace. Coaches create session templates (atomic units) and training programs (multi-week plans). The current program builder is a basic week/day grid with text-based exercise input.

This spec redesigns the program builder with:
- 6-level training hierarchy (exercise → routine → session → microcycle → mesocycle → macrocycle)
- Drag & drop composition
- Event-based program generation with web scraping
- Physiological load tracking (TSS/CTL/ATL/TSB, musculoskeletal)
- Menstrual cycle integration
- Reusable blocks and conditional rules
- Two-tier interface: simple for basic coaches, pro mode for advanced

## Glossary

| Term | French UI | Description |
|------|-----------|-------------|
| Exercise | Exercice | Atomic unit: Squat 4x10, Course 30min Z2 |
| Routine | Routine | Reusable snippet of exercises (warmup, cooldown, prehab) |
| Session | Seance | A complete workout: warmup routine + main block + cooldown routine |
| Microcycle | Semaine type | 7-day pattern of sessions, repeatable |
| Mesocycle / Block | Bloc | 3-6 weeks with a training focus and progression curve |
| Macrocycle / Program | Programme | The full plan from start to target event |
| Rule | Regle | Conditional logic that modifies sessions (auto-insert routines, deload, etc.) |
| Target Event | Objectif | A race/competition the program builds toward |
| Cycle Phase | Phase du cycle | Menstrual cycle overlay affecting session intensity |

## Data Model

### New Tables

#### `exercises` — Exercise catalog (ported from VIVO)

Source: OIKOS/packages/vivo/src/data/exercise-catalog.ts

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| name | text | French name |
| name_en | text | English name |
| sport | text | crossfit, yoga, running, musculation, etc. |
| category | text | compound, isolation, cardio, flexibility |
| muscle_engagement | jsonb | `{ quadriceps: 90, glutes: 85, ... }` (0-100 per muscle group) |
| tendon_stress | jsonb | `{ patellar: 75, achilles: 40, ... }` (0-100 per tendon) |
| joint_impact | jsonb | `{ knees: 80, hips: 60, ... }` (0-100 per joint) |
| default_duration | integer | Default duration in minutes (for cardio) |
| default_rpe | integer | Default RPE 1-10 |
| is_custom | boolean | false = global catalog, true = coach-created |
| coach_id | uuid? | FK to coach_profiles, null for global exercises |
| created_at | timestamptz | |

Muscle groups (13): quadriceps, hamstrings, calves, glutes, hip_flexors, core, lower_back, upper_back, chest, shoulders, biceps, triceps, forearms

Tendons (7): achilles, patellar, rotator_cuff, it_band, plantar_fascia, biceps_tendon, pec_tendon

Joints (7): knees, ankles, hips, shoulders, elbows, wrists, lumbar_spine

Seed data: 15 exercises from VIVO exercise-catalog.ts + QUICK_EXERCISES from Pulse create-session-modal.tsx expanded to full format.

#### `routines` — Reusable exercise blocks

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| coach_id | uuid | FK to coach_profiles |
| title | text | "Echauffement mobilite", "Core routine" |
| type | text | warmup, cooldown, prehab, mobility, core, activation |
| exercises | jsonb | `{ exercises: [{ exercise_id, sets, reps, rest_seconds, duration_minutes }] }` |
| duration_minutes | integer | Estimated total duration |
| created_at | timestamptz | |

#### `program_blocks` — Mesocycles within a program

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| program_id | uuid | FK to training_programs |
| title | text | "Phase de base", "Build force" |
| phase | text | base, build, peak, taper, race, recovery |
| focus | text | hypertrophy, strength, endurance, power, recovery, general |
| week_start | integer | First week number in the program |
| week_end | integer | Last week number |
| order_index | integer | Sort order |
| progression_curve | jsonb | `[70, 75, 80, 60]` — intensity % per week within block |
| created_at | timestamptz | |

#### `program_rules` — Conditional logic

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| program_id | uuid | FK to training_programs |
| title | text | Human-readable description |
| trigger | text | before_session, every_nth_week, tsb_threshold, cycle_phase, after_race, always |
| condition | jsonb | `{ session_type: "strength" }` or `{ week_mod: 4 }` or `{ tsb_below: -20 }` or `{ phase: "luteal" }` |
| action | jsonb | `{ type: "insert_routine", routine_id: "xxx" }` or `{ type: "reduce_intensity", percent: 15 }` or `{ type: "swap_session", replacement: "active_recovery" }` or `{ type: "alert", message: "..." }` |
| is_active | boolean | |
| created_at | timestamptz | |

#### `cycle_tracking` — Menstrual cycle (optional, encrypted)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK to auth.users |
| last_period_date | date | Date of last period start |
| avg_cycle_days | integer | Average cycle length (default 28) |
| avg_period_days | integer | Average period duration (default 5) |
| consent_given_at | timestamptz | When user explicitly opted in |
| created_at | timestamptz | |

Cycle phases calculated client-side from these inputs:
- Menstruation: day 1 to avg_period_days
- Follicular: avg_period_days+1 to ~day 13
- Ovulation: ~day 13-15
- Luteal: ~day 16 to avg_cycle_days

#### `target_events` — Scraped event data

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| program_id | uuid | FK to training_programs |
| name | text | "Marathon de Paris 2027" |
| event_date | date | Race day |
| sport | text | |
| location | text | City/venue |
| distance_km | numeric | |
| elevation_m | integer | Total elevation gain |
| terrain_type | text | road, trail, mixed, indoor |
| scraped_data | jsonb | Conditions, experience reports, Strava segments, course profile |
| source_urls | text[] | URLs scraped |
| created_at | timestamptz | |

### Modified Tables

#### `program_workouts` — Add columns

| New Column | Type | Description |
|------------|------|-------------|
| block_id | uuid? | FK to program_blocks |
| session_template_id | uuid? | FK to session_templates (links session to workout) |
| routine_warmup_id | uuid? | FK to routines (auto-attached or manual) |
| routine_cooldown_id | uuid? | FK to routines |
| intensity_percent | integer | 0-100, adjusted by block progression curve |

#### `training_programs` — Add columns

| New Column | Type | Description |
|------------|------|-------------|
| target_event_id | uuid? | FK to target_events |
| athlete_id | uuid? | FK to auth.users — who this program is for |
| periodization_type | text | linear, undulating, block, custom |
| pro_mode | boolean | Whether advanced metrics are enabled |

## Physiological Engine (ported from VIVO)

### Files to port from OIKOS/packages/vivo/src/lib/training/

| VIVO file | Pulse destination | Purpose |
|-----------|-------------------|---------|
| load-metrics.ts | src/lib/training/load-metrics.ts | CTL, ATL, TSB calculations |
| tss-calculator.ts | src/lib/training/tss-calculator.ts | Training Stress Score from activity |
| muscle-load.ts | src/lib/training/muscle-load.ts | Muscle group fatigue & recovery |
| tendon-joint-load.ts | src/lib/training/tendon-joint-load.ts | Tendon/joint stress accumulation |
| recommendations.ts | src/lib/training/recommendations.ts | AI suggestions based on load/phase |

### Types to port from OIKOS/packages/vivo/src/types/training.ts

All types: Activity, LoadMetrics, RecoveryScore, MuscleLoad, TendonJointStatus, Exercise, MuscleGroup, Tendon, Joint, TrainingPhase, PhaseDef, WeeklyTarget, Recommendation, LimitingFactor, MedicalConstraint.

### Cycle phase calculator (new)

```typescript
function getCyclePhase(lastPeriod: Date, avgCycleDays: number, avgPeriodDays: number, date: Date): CyclePhase {
  const dayInCycle = diffDays(lastPeriod, date) % avgCycleDays;
  if (dayInCycle < avgPeriodDays) return 'menstruation';
  if (dayInCycle < 13) return 'follicular';
  if (dayInCycle < 16) return 'ovulation';
  return 'luteal';
}
```

Phase-specific adjustments:
- follicular: intensity_modifier = 1.0 (push hard)
- ovulation: intensity_modifier = 1.0, alert on plyometrics (ACL risk)
- luteal: intensity_modifier = 0.85, favor endurance
- menstruation: intensity_modifier = 0.9, offer alternatives if discomfort

## UI Architecture

### Two Modes

#### Mode Simple (default for all coaches)

**Program list page** (`/coach/programs`): existing page with wizard modal (already built).

**Program detail page** (`/coach/programs/[id]`): redesigned as:

- **Top bar**: program title, sport badge, target event (if any), duration, publish/draft toggle
- **Left panel** (collapsible on mobile): session library
  - Coach's session templates (from session_templates table)
  - Coach's routines
  - Quick-create buttons for new sessions/routines
  - Search/filter by sport
- **Main area**: week grid (7 columns, N rows = N weeks)
  - Each cell = a day, shows session cards (colored by sport)
  - **Drag from left panel → drop on a day cell** to assign
  - **Drag between cells** to move sessions
  - Click session card → opens workout editor modal (existing)
  - Empty cell shows ghost "+ Ajouter" on hover
- **Bottom actions**: "Appliquer comme semaine type" (stamp current week to next N weeks), "Dupliquer le bloc"

#### Mode Pro (toggled in coach settings or per-program)

Adds on top of Mode Simple:

- **Timeline bar** (above the grid): horizontal bar showing mesocycle blocks with phase colors
  - Click to add/edit blocks
  - Blocks snap to week boundaries
  - Phase colors: base=blue, build=orange, peak=red, taper=green, race=gold, recovery=purple
- **Load overlay** (on each day cell): small TSB indicator (green=fresh, yellow=moderate, red=fatigued)
- **Muscle heatmap panel** (expandable): body map showing accumulated load (from VIVO muscle-body-map component concept)
- **Cycle overlay** (if athlete has tracking): colored band at top of grid showing menstrual phases
- **Rules panel** (sidebar tab): list of active rules with add/edit/delete
- **Progression curve editor** (per block): visual editor for intensity % across weeks in a mesocycle
- **Recovery alerts**: red badges on sessions that violate recovery windows

### Event-based Program Creation Flow

1. Coach clicks "Nouveau programme" → wizard step 1: basic info (title, sport, level)
2. **New step**: "Objectif / Evenement cible" (optional)
   - Text input: "Marathon de Paris 2027" or paste URL
   - "Rechercher" button → calls backend scraping endpoint
   - Shows scraped info: date, distance, elevation, terrain, conditions
   - Coach confirms or edits
3. Wizard step 2 (enhanced): duration auto-calculated from today → event date
   - Phases auto-generated based on periodization model
   - Coach can adjust phase boundaries
4. Wizard step 3: athlete profile (if assigning to specific athlete)
   - Current volume, level, injury history
   - Cycle tracking status (if female athlete with consent)
5. **AI generation**: "Generer un programme" button
   - Uses: event data + athlete profile + periodization rules + exercise catalog
   - Generates a complete program skeleton with sessions per day
   - Coach reviews, adjusts, publishes

### Drag & Drop Implementation

Library: `@dnd-kit/core` + `@dnd-kit/sortable`

Drag sources:
- Session template cards in library panel
- Routine cards in library panel
- Existing session cards in the grid (for moving)
- Exercise rows within workout editor (for reordering)

Drop targets:
- Day cells in the week grid
- Warmup/cooldown slots in a session
- Exercise list in workout editor

Visual feedback:
- Ghost preview of dragged item
- Drop zone highlight (green border)
- Invalid drop indicator (red) for rule violations

### API Endpoints (new)

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | /api/exercises | Exercise catalog (global + coach custom) |
| GET/POST/PATCH/DELETE | /api/routines | Coach's reusable routines |
| GET/POST/PATCH/DELETE | /api/programs/[id]/blocks | Program mesocycles |
| GET/POST/PATCH/DELETE | /api/programs/[id]/rules | Program rules |
| POST | /api/programs/[id]/generate | AI program generation |
| POST | /api/programs/[id]/scrape-event | Scrape event info |
| GET/POST/PATCH | /api/cycle-tracking | Menstrual cycle data |
| GET | /api/programs/[id]/load-analysis | TSS/CTL/ATL/TSB for program |

### Event Scraping Endpoint

`POST /api/programs/[id]/scrape-event`

Input: `{ query: "Marathon de Paris 2027" }` or `{ url: "https://..." }`

Process:
1. Search via Tavily API (web search) for event details
2. Search via Perplexity API for experience reports
3. Extract structured data: date, distance, elevation, terrain, conditions
4. Search for Strava segments on the course (if available)
5. Store in target_events table
6. Return structured event data

Requires: Tavily API key (already in Dimitri's global settings) and Perplexity API key (already available).

## Dependencies to Install

- `@dnd-kit/core` — drag & drop engine
- `@dnd-kit/sortable` — sortable lists
- `@dnd-kit/utilities` — CSS transform utilities

## File Structure (new files)

```
src/
  lib/
    training/
      load-metrics.ts        # CTL/ATL/TSB (from VIVO)
      tss-calculator.ts      # TSS calculation (from VIVO)
      muscle-load.ts         # Muscle fatigue (from VIVO)
      tendon-joint-load.ts   # Tendon/joint stress (from VIVO)
      recommendations.ts     # AI suggestions (from VIVO)
      cycle-phase.ts         # Menstrual cycle calculator
      periodization.ts       # Phase auto-generation from event date
      program-generator.ts   # AI program skeleton generation
  components/
    coach/
      program-builder/
        program-builder.tsx       # Main builder layout (grid + panels)
        session-library.tsx       # Left panel with draggable sessions
        week-grid.tsx             # The calendar grid (drop targets)
        day-cell.tsx              # Individual day cell
        session-card-draggable.tsx # Draggable session card
        timeline-bar.tsx          # Pro mode: mesocycle phase bar
        load-overlay.tsx          # Pro mode: TSB indicators
        cycle-overlay.tsx         # Pro mode: menstrual phase band
        rules-panel.tsx           # Pro mode: rules editor
        progression-editor.tsx    # Pro mode: intensity curve
        muscle-heatmap.tsx        # Pro mode: body load map
      routine-editor-modal.tsx    # Create/edit routines
      event-search-modal.tsx      # Search & scrape target event
  app/
    api/
      exercises/route.ts
      routines/route.ts
      programs/[id]/blocks/route.ts
      programs/[id]/rules/route.ts
      programs/[id]/generate/route.ts
      programs/[id]/scrape-event/route.ts
      cycle-tracking/route.ts
      programs/[id]/load-analysis/route.ts

supabase/
  migrations/
    20260414_exercises.sql
    20260414_routines.sql
    20260414_program_blocks.sql
    20260414_program_rules.sql
    20260414_cycle_tracking.sql
    20260414_target_events.sql
    20260414_program_workouts_enhanced.sql
```

## Implementation Order

1. **DB migrations** — new tables + altered columns
2. **Exercise catalog** — port from VIVO, seed data, API
3. **Routines** — CRUD + editor modal
4. **Program blocks** — mesocycle model + API
5. **Drag & drop** — install dnd-kit, session library, week grid
6. **Periodization engine** — port from VIVO, phase auto-generation
7. **Load tracking** — TSS/CTL/ATL/TSB, muscle load
8. **Event scraping** — Tavily + Perplexity integration
9. **AI program generation** — skeleton from event + athlete profile
10. **Cycle tracking** — optional overlay
11. **Rules engine** — conditional logic
12. **Pro mode UI** — timeline, heatmap, load overlay, progression editor

## Out of Scope (V2+)

- Mobile drag & drop (complex touch handling, V2)
- Video exercise library (exercise tutorial videos)
- Real-time collaboration (coach + athlete editing together)
- Integration with wearable recovery data for auto-adjustment
- Marketplace for programs (buy/sell templates between coaches)
- Multi-sport periodization (triathlon with swim/bike/run split)

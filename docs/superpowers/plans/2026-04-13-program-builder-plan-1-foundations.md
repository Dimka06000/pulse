# Program Builder — Plan 1: Foundations (DB + Exercise Catalog + Routines)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the exercise catalog, routines system, and program blocks/rules/events DB tables that the entire program builder depends on.

**Architecture:** New Supabase tables via SQL migrations (run via Node postgres driver, port 6543). Exercise catalog ported from VIVO with 15+ seeded exercises. Routines are coach-owned reusable exercise blocks. API routes follow existing Next.js patterns (getSupabaseServerClient for auth, getSupabaseAdminClient for data).

**Tech Stack:** Supabase (PostgreSQL), Next.js API routes, Vitest, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-13-program-builder-design.md`

**Migration method:** `supabase db push` fails (port 5432 blocked by ISP). Use Node postgres driver:
```js
const postgres = require('postgres');
const sql = postgres('postgresql://postgres.pvaqmwgmxsyddzvnbnjr:Di96de13%26*0000@aws-1-eu-west-2.pooler.supabase.com:6543/postgres', { ssl: 'require' });
await sql.unsafe(migrationSQL);
```

---

### Task 1: Exercise catalog migration + seed data

**Files:**
- Create: `supabase/migrations/20260414_exercises.sql`
- Create: `scripts/seed-exercises.mjs`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260414_exercises.sql`:

```sql
-- Exercise catalog (global + coach custom)
CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  sport text NOT NULL,
  category text NOT NULL DEFAULT 'compound' CHECK (category IN ('compound', 'isolation', 'cardio', 'flexibility')),
  muscle_engagement jsonb NOT NULL DEFAULT '{}',
  tendon_stress jsonb NOT NULL DEFAULT '{}',
  joint_impact jsonb NOT NULL DEFAULT '{}',
  default_duration integer,
  default_rpe integer,
  is_custom boolean NOT NULL DEFAULT false,
  coach_id uuid REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_exercises_sport ON public.exercises(sport);
CREATE INDEX idx_exercises_coach ON public.exercises(coach_id) WHERE coach_id IS NOT NULL;

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads global exercises" ON public.exercises FOR SELECT USING (is_custom = false);
CREATE POLICY "Coach reads own exercises" ON public.exercises FOR SELECT USING (auth.uid() = (SELECT user_id FROM coach_profiles WHERE id = coach_id));
CREATE POLICY "Coach manages own exercises" ON public.exercises FOR ALL USING (auth.uid() = (SELECT user_id FROM coach_profiles WHERE id = coach_id));

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Run the migration**

```bash
node -e "
const postgres = require('postgres');
const fs = require('fs');
const sql = postgres('postgresql://postgres.pvaqmwgmxsyddzvnbnjr:Di96de13%26*0000@aws-1-eu-west-2.pooler.supabase.com:6543/postgres', { ssl: 'require' });
const migration = fs.readFileSync('supabase/migrations/20260414_exercises.sql', 'utf8');
sql.unsafe(migration).then(() => { console.log('OK'); sql.end(); }).catch(e => { console.error(e); sql.end(); process.exit(1); });
"
```

Expected: `OK`

- [ ] **Step 3: Write the seed script**

Create `scripts/seed-exercises.mjs`. Port all 15 exercises from VIVO (`OIKOS/packages/vivo/src/data/exercise-catalog.ts`) plus expand the QUICK_EXERCISES lists from `src/components/coach/workout-editor-modal.tsx` into the full format. Each exercise needs: name, name_en, sport, category, muscle_engagement, tendon_stress, joint_impact.

The seed script should:
1. Connect to Supabase via postgres driver (port 6543)
2. Delete existing global exercises (`is_custom = false`)
3. Insert the full catalog (~40 exercises covering all sports)
4. Log count of inserted exercises

Reference for exercise data:
- Strength exercises: `OIKOS/packages/vivo/src/data/exercise-catalog.ts` (15 exercises with full musculoskeletal data)
- Cardio exercises: expand QUICK_EXERCISES from workout-editor-modal.tsx — for cardio sports (running, cyclisme, natation, yoga), set `category: 'cardio'`, `default_duration: 20`, and add basic muscle_engagement from VIVO's `DISCIPLINE_PROFILES`
- Combat exercises (boxe): `category: 'cardio'`, engagement from general fitness profile
- Fitness exercises: `category: 'compound'` or `'isolation'` depending on exercise

- [ ] **Step 4: Run the seed**

```bash
node scripts/seed-exercises.mjs
```

Expected: `Inserted N exercises`

- [ ] **Step 5: Verify in DB**

```bash
node -e "
const postgres = require('postgres');
const sql = postgres('postgresql://postgres.pvaqmwgmxsyddzvnbnjr:Di96de13%26*0000@aws-1-eu-west-2.pooler.supabase.com:6543/postgres', { ssl: 'require' });
sql\`SELECT sport, count(*) FROM exercises WHERE is_custom = false GROUP BY sport ORDER BY sport\`.then(r => { r.forEach(x => console.log(x.sport, x.count)); sql.end(); });
"
```

Expected: counts per sport

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260414_exercises.sql scripts/seed-exercises.mjs
git commit -m "feat(db): exercise catalog table + seed 40+ exercises from VIVO"
```

---

### Task 2: Exercise catalog API

**Files:**
- Create: `src/app/api/exercises/route.ts`
- Create: `__tests__/lib/exercises.test.ts`

- [ ] **Step 1: Write the test**

Create `__tests__/lib/exercises.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('exercises API shape', () => {
  it('exercise has required fields', () => {
    const exercise = {
      id: 'squat',
      name: 'Squat',
      name_en: 'Squat',
      sport: 'musculation',
      category: 'compound',
      muscle_engagement: { quadriceps: 90, glutes: 85 },
      tendon_stress: { patellar: 75 },
      joint_impact: { knees: 80 },
      is_custom: false,
    };

    expect(exercise.name).toBeTruthy();
    expect(exercise.sport).toBeTruthy();
    expect(['compound', 'isolation', 'cardio', 'flexibility']).toContain(exercise.category);
    expect(exercise.muscle_engagement).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

```bash
npx vitest run __tests__/lib/exercises.test.ts
```

Expected: PASS

- [ ] **Step 3: Write the API route**

Create `src/app/api/exercises/route.ts`:

- **GET**: List exercises. Query params: `sport` (filter), `coach_id` (include coach's custom exercises). Returns global exercises + coach's custom ones. Uses `getSupabaseAdminClient()`.
- **POST**: Create custom exercise. Requires auth + coach profile. Sets `is_custom = true`, `coach_id = coachProfile.id`. Validates required fields (name, sport, category).

Follow the exact pattern from `src/app/api/coaches/me/sessions/route.ts` for auth + coach profile resolution.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/exercises/route.ts __tests__/lib/exercises.test.ts
git commit -m "feat(api): GET/POST /api/exercises — catalog with coach custom exercises"
```

---

### Task 3: Routines table migration

**Files:**
- Create: `supabase/migrations/20260414_routines.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Reusable exercise blocks (warmup, cooldown, prehab, etc.)
CREATE TABLE IF NOT EXISTS public.routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'warmup' CHECK (type IN ('warmup', 'cooldown', 'prehab', 'mobility', 'core', 'activation')),
  exercises jsonb NOT NULL DEFAULT '{"exercises": []}',
  duration_minutes integer NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_routines_coach ON public.routines(coach_id);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages own routines" ON public.routines FOR ALL USING (
  auth.uid() = (SELECT user_id FROM coach_profiles WHERE id = coach_id)
);

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Run the migration**

Same Node postgres pattern as Task 1 Step 2.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260414_routines.sql
git commit -m "feat(db): routines table for reusable exercise blocks"
```

---

### Task 4: Routines API

**Files:**
- Create: `src/app/api/routines/route.ts`

- [ ] **Step 1: Write the API route**

`src/app/api/routines/route.ts`:

- **GET**: List coach's routines. Auth required + coach profile. Filter by `type` query param (optional). Order by created_at desc.
- **POST**: Create routine. Required: title, type. Optional: exercises (jsonb), duration_minutes.
- **PATCH**: Update routine. Required: id in body. Verify ownership.
- **DELETE**: Delete routine. Required: id in query params. Verify ownership.

Follow the exact CRUD pattern from `src/app/api/coaches/me/sessions/route.ts` (which has GET/POST/PATCH/DELETE with ownership verification).

- [ ] **Step 2: Commit**

```bash
git add src/app/api/routines/route.ts
git commit -m "feat(api): CRUD /api/routines — reusable exercise blocks"
```

---

### Task 5: Routine editor modal

**Files:**
- Create: `src/components/coach/routine-editor-modal.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/coach/routine-editor-modal.tsx`. This is a modal for creating/editing routines. Structure:

1. Follow the exact modal pattern from `src/components/coach/session-wizard-modal.tsx` (fixed inset-0, backdrop, role="dialog", aria-modal, Escape key)
2. **Not a wizard** — single-page modal (routines are simple)
3. Fields:
   - Title (Input)
   - Type selector: 6 pill buttons (warmup, cooldown, prehab, mobility, core, activation) with French labels
   - Exercise builder: same as workout-editor-modal.tsx but simplified — quick exercise chips per sport + custom input + sets/reps/rest per exercise
   - Duration (auto-calculated from exercises or manual override)
4. Props: `open, onClose, onSaved, sport (for exercise presets), editRoutine?`
5. Uses POST /api/routines to create, PATCH to update
6. Export type `Routine` with: id, title, type, exercises, duration_minutes

Reuse the exercise builder logic from `src/components/coach/workout-editor-modal.tsx` (EXERCISE_PRESETS, ExerciseItem interface, addExercise/removeExercise/moveExercise functions). Don't duplicate — import ExerciseItem from workout-editor-modal.tsx if possible, or extract to a shared file.

- [ ] **Step 2: Commit**

```bash
git add src/components/coach/routine-editor-modal.tsx
git commit -m "feat(ui): routine editor modal — create/edit reusable exercise blocks"
```

---

### Task 6: Program enhancement migrations (blocks, rules, events, workout columns)

**Files:**
- Create: `supabase/migrations/20260414_program_blocks.sql`
- Create: `supabase/migrations/20260414_program_rules.sql`
- Create: `supabase/migrations/20260414_target_events.sql`
- Create: `supabase/migrations/20260414_cycle_tracking.sql`
- Create: `supabase/migrations/20260414_program_workouts_enhanced.sql`

- [ ] **Step 1: Write program_blocks migration**

```sql
CREATE TABLE IF NOT EXISTS public.program_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  title text NOT NULL,
  phase text NOT NULL DEFAULT 'base' CHECK (phase IN ('base', 'build', 'peak', 'taper', 'race', 'recovery')),
  focus text NOT NULL DEFAULT 'general' CHECK (focus IN ('hypertrophy', 'strength', 'endurance', 'power', 'recovery', 'general')),
  week_start integer NOT NULL,
  week_end integer NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  progression_curve jsonb NOT NULL DEFAULT '[100]',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_program_blocks_program ON public.program_blocks(program_id);
ALTER TABLE public.program_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages blocks via program" ON public.program_blocks FOR ALL USING (
  EXISTS (SELECT 1 FROM training_programs tp JOIN coach_profiles cp ON tp.coach_id = cp.id WHERE tp.id = program_id AND cp.user_id = auth.uid())
);

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Write program_rules migration**

```sql
CREATE TABLE IF NOT EXISTS public.program_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  title text NOT NULL,
  trigger text NOT NULL CHECK (trigger IN ('before_session', 'every_nth_week', 'tsb_threshold', 'cycle_phase', 'after_race', 'always')),
  condition jsonb NOT NULL DEFAULT '{}',
  action jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_program_rules_program ON public.program_rules(program_id);
ALTER TABLE public.program_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages rules via program" ON public.program_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM training_programs tp JOIN coach_profiles cp ON tp.coach_id = cp.id WHERE tp.id = program_id AND cp.user_id = auth.uid())
);

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 3: Write target_events migration**

```sql
CREATE TABLE IF NOT EXISTS public.target_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES public.training_programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  event_date date,
  sport text,
  location text,
  distance_km numeric,
  elevation_m integer,
  terrain_type text CHECK (terrain_type IN ('road', 'trail', 'mixed', 'indoor', 'water')),
  scraped_data jsonb NOT NULL DEFAULT '{}',
  source_urls text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.target_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages events via program" ON public.target_events FOR ALL USING (
  program_id IS NULL OR EXISTS (SELECT 1 FROM training_programs tp JOIN coach_profiles cp ON tp.coach_id = cp.id WHERE tp.id = program_id AND cp.user_id = auth.uid())
);

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 4: Write cycle_tracking migration**

```sql
CREATE TABLE IF NOT EXISTS public.cycle_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  last_period_date date NOT NULL,
  avg_cycle_days integer NOT NULL DEFAULT 28,
  avg_period_days integer NOT NULL DEFAULT 5,
  consent_given_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.cycle_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own cycle data" ON public.cycle_tracking FOR ALL USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 5: Write program_workouts enhancement migration**

```sql
-- Add new columns to existing program_workouts table
ALTER TABLE public.program_workouts ADD COLUMN IF NOT EXISTS block_id uuid REFERENCES public.program_blocks(id) ON DELETE SET NULL;
ALTER TABLE public.program_workouts ADD COLUMN IF NOT EXISTS session_template_id uuid REFERENCES public.session_templates(id) ON DELETE SET NULL;
ALTER TABLE public.program_workouts ADD COLUMN IF NOT EXISTS routine_warmup_id uuid REFERENCES public.routines(id) ON DELETE SET NULL;
ALTER TABLE public.program_workouts ADD COLUMN IF NOT EXISTS routine_cooldown_id uuid REFERENCES public.routines(id) ON DELETE SET NULL;
ALTER TABLE public.program_workouts ADD COLUMN IF NOT EXISTS intensity_percent integer DEFAULT 100;

-- Add new columns to training_programs
ALTER TABLE public.training_programs ADD COLUMN IF NOT EXISTS target_event_id uuid REFERENCES public.target_events(id) ON DELETE SET NULL;
ALTER TABLE public.training_programs ADD COLUMN IF NOT EXISTS athlete_id uuid REFERENCES auth.users ON DELETE SET NULL;
ALTER TABLE public.training_programs ADD COLUMN IF NOT EXISTS periodization_type text DEFAULT 'custom' CHECK (periodization_type IN ('linear', 'undulating', 'block', 'custom'));
ALTER TABLE public.training_programs ADD COLUMN IF NOT EXISTS pro_mode boolean DEFAULT false;

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 6: Run all 5 migrations**

Run each migration file sequentially via the Node postgres driver.

- [ ] **Step 7: Verify all tables exist**

```bash
node -e "
const postgres = require('postgres');
const sql = postgres('postgresql://postgres.pvaqmwgmxsyddzvnbnjr:Di96de13%26*0000@aws-1-eu-west-2.pooler.supabase.com:6543/postgres', { ssl: 'require' });
sql\`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('exercises', 'routines', 'program_blocks', 'program_rules', 'target_events', 'cycle_tracking') ORDER BY table_name\`.then(r => { r.forEach(x => console.log('OK:', x.table_name)); sql.end(); });
"
```

Expected: 6 tables listed

- [ ] **Step 8: Verify new columns on program_workouts**

```bash
node -e "
const postgres = require('postgres');
const sql = postgres('postgresql://postgres.pvaqmwgmxsyddzvnbnjr:Di96de13%26*0000@aws-1-eu-west-2.pooler.supabase.com:6543/postgres', { ssl: 'require' });
sql\`SELECT column_name FROM information_schema.columns WHERE table_name = 'program_workouts' AND column_name IN ('block_id', 'session_template_id', 'routine_warmup_id', 'routine_cooldown_id', 'intensity_percent')\`.then(r => { r.forEach(x => console.log('OK:', x.column_name)); sql.end(); });
"
```

Expected: 5 columns listed

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260414_*.sql
git commit -m "feat(db): program blocks, rules, target events, cycle tracking, workout enhancements"
```

---

### Task 7: Program blocks + rules API routes

**Files:**
- Create: `src/app/api/programs/[id]/blocks/route.ts`
- Create: `src/app/api/programs/[id]/rules/route.ts`

- [ ] **Step 1: Write blocks API**

`src/app/api/programs/[id]/blocks/route.ts`:

- **GET**: List blocks for a program, ordered by order_index
- **POST**: Create block. Required: title, phase, week_start, week_end. Optional: focus, progression_curve.
- **PATCH**: Update block. Required: block_id in body. Verify coach ownership via program.
- **DELETE**: Delete block. Required: block_id in query params.

Auth pattern: same as `src/app/api/programs/[id]/workouts/route.ts` — get user, find program, verify coach_profiles ownership.

- [ ] **Step 2: Write rules API**

`src/app/api/programs/[id]/rules/route.ts`:

- **GET**: List rules for a program
- **POST**: Create rule. Required: title, trigger, condition, action.
- **PATCH**: Update rule. Required: rule_id in body.
- **DELETE**: Delete rule. Required: rule_id in query params.

Same auth pattern.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/programs/[id]/blocks/route.ts src/app/api/programs/[id]/rules/route.ts
git commit -m "feat(api): CRUD /api/programs/[id]/blocks and /api/programs/[id]/rules"
```

---

### Task 8: Training types + exercise shared module

**Files:**
- Create: `src/lib/training/types.ts`
- Create: `src/lib/training/exercises.ts`

- [ ] **Step 1: Write training types**

Create `src/lib/training/types.ts`. Port from VIVO (`OIKOS/packages/vivo/src/types/training.ts`):

Export types: `Discipline`, `TrainingPhase`, `MuscleGroup`, `Tendon`, `Joint`, `MuscleLoad`, `TendonJointStatus`, `Exercise`, `LoadMetrics`, `RecoveryScore`, `PhaseDef`, `WeeklyTarget`, `Recommendation`, `CyclePhase`.

Add `CyclePhase = 'menstruation' | 'follicular' | 'ovulation' | 'luteal'`.

- [ ] **Step 2: Write exercise utilities**

Create `src/lib/training/exercises.ts`:

- Export `DISCIPLINE_PROFILES` (ported from VIVO exercise-catalog.ts)
- Export `getExercisesByDiscipline(exercises, discipline)` — filter function
- Export `isCardioSport(sport)` — returns true for running, cyclisme, natation, yoga
- Export `SPORT_TO_DISCIPLINE` mapping (Pulse sports → VIVO disciplines: musculation→strength, running→run, natation→swim, cyclisme→bike, etc.)

- [ ] **Step 3: Write test**

Create `__tests__/lib/training-types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isCardioSport, SPORT_TO_DISCIPLINE } from '@/lib/training/exercises';

describe('training exercises', () => {
  it('identifies cardio sports', () => {
    expect(isCardioSport('running')).toBe(true);
    expect(isCardioSport('musculation')).toBe(false);
  });

  it('maps pulse sports to VIVO disciplines', () => {
    expect(SPORT_TO_DISCIPLINE['musculation']).toBe('strength');
    expect(SPORT_TO_DISCIPLINE['running']).toBe('run');
    expect(SPORT_TO_DISCIPLINE['natation']).toBe('swim');
  });
});
```

- [ ] **Step 4: Run test**

```bash
npx vitest run __tests__/lib/training-types.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/training/types.ts src/lib/training/exercises.ts __tests__/lib/training-types.test.ts
git commit -m "feat: training types + exercise utilities ported from VIVO"
```

---

### Task 9: Extract shared exercise builder

**Files:**
- Create: `src/components/coach/exercise-builder.tsx`
- Modify: `src/components/coach/workout-editor-modal.tsx`
- Modify: `src/components/coach/routine-editor-modal.tsx`

- [ ] **Step 1: Extract exercise builder component**

The exercise building UI (quick chips, custom input, sets/reps/rest editors, reorder buttons) is duplicated between workout-editor-modal and routine-editor-modal. Extract to `src/components/coach/exercise-builder.tsx`:

Props:
```typescript
interface ExerciseBuilderProps {
  sport: string;
  exercises: ExerciseItem[];
  onChange: (exercises: ExerciseItem[]) => void;
}
```

Move from workout-editor-modal.tsx:
- EXERCISE_PRESETS constant
- CARDIO_SPORTS constant
- ExerciseItem type export
- Quick exercise chips rendering
- Custom exercise input with autocomplete
- Exercise list with sets/reps/rest editors
- Move up/down/remove buttons

- [ ] **Step 2: Update workout-editor-modal to use ExerciseBuilder**

Replace the inline exercise UI in workout-editor-modal.tsx with `<ExerciseBuilder sport={sport} exercises={exercises} onChange={setExercises} />`.

- [ ] **Step 3: Update routine-editor-modal to use ExerciseBuilder**

Same — use `<ExerciseBuilder>` instead of duplicating exercise UI.

- [ ] **Step 4: Build to verify**

```bash
npx next build 2>&1 | tail -5
```

Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/components/coach/exercise-builder.tsx src/components/coach/workout-editor-modal.tsx src/components/coach/routine-editor-modal.tsx
git commit -m "refactor: extract shared ExerciseBuilder component from workout/routine editors"
```

---

### Task 10: Build + push everything

- [ ] **Step 1: Full build**

```bash
npx next build
```

Expected: No errors

- [ ] **Step 2: Push**

```bash
git push
```

- [ ] **Step 3: Verify Vercel deployment**

```bash
npx vercel ls 2>&1 | head -5
```

Expected: Latest deployment status = Ready

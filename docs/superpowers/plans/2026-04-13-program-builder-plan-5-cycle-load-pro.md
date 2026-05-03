# Program Builder — Plan 5: Cycle Tracking + Load Overlay + Pro Mode

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add menstrual cycle tracking with consent, load analysis overlay on the week grid, and a pro mode toggle that reveals advanced physiological indicators (TSB badges, muscle heatmap, cycle overlay).

**Architecture:** Cycle phase calculator in `src/lib/training/`, new API endpoint for cycle data, UI overlays on the existing program builder grid, pro mode toggle in program settings.

**Tech Stack:** TypeScript, React, Tailwind CSS, Supabase

**Spec:** `docs/superpowers/specs/2026-04-13-program-builder-design.md`

---

### Task 1: Cycle phase calculator

**Files:**
- Create: `src/lib/training/cycle-phase.ts`
- Create: `__tests__/lib/cycle-phase.test.ts`

```typescript
export type CyclePhase = 'menstruation' | 'follicular' | 'ovulation' | 'luteal';

export interface CycleInfo {
  phase: CyclePhase;
  dayInCycle: number;
  intensityModifier: number; // 0.85-1.0
  recommendations: string[];
  aclWarning: boolean;
}

export function getCyclePhase(lastPeriodDate: string, avgCycleDays: number, avgPeriodDays: number, targetDate: string): CycleInfo
```

Logic:
- Calculate dayInCycle = (targetDate - lastPeriodDate) % avgCycleDays
- Menstruation: day 0 to avgPeriodDays-1 → intensity 0.9, reco: "Adapter l'intensité si inconfort"
- Follicular: avgPeriodDays to day 12 → intensity 1.0, reco: "Fenêtre optimale pour la force et le HIIT"
- Ovulation: day 13 to 15 → intensity 1.0, aclWarning: true, reco: "Pic de puissance — attention risque ACL sur pliométrie"
- Luteal: day 16 to avgCycleDays-1 → intensity 0.85, reco: "Réduire l'intensité, favoriser l'endurance"

Tests:
- Day 3 → menstruation, intensity 0.9
- Day 8 → follicular, intensity 1.0
- Day 14 → ovulation, aclWarning true
- Day 22 → luteal, intensity 0.85
- Wrap-around (day > avgCycleDays)

---

### Task 2: Cycle tracking API

**Files:**
- Create: `src/app/api/cycle-tracking/route.ts`

The `cycle_tracking` table already exists (from Plan 1 migrations).

**GET** — Get current user's cycle data (auth required, user-level not coach-level)
**POST** — Create/update cycle data. Required: last_period_date. Optional: avg_cycle_days (default 28), avg_period_days (default 5). Sets consent_given_at to now(). Upsert on user_id unique constraint.
**DELETE** — Remove cycle data (revoke consent)

Auth: uses getSupabaseServerClient for user check, getSupabaseAdminClient for data. No coach profile required — this is athlete-level data.

---

### Task 3: Load overlay component

**Files:**
- Create: `src/components/coach/program-builder/load-overlay.tsx`

A small badge/indicator showing TSB status for a specific day in the program grid.

```typescript
interface LoadOverlayProps {
  tsb: number;
}
```

Visual: a small colored dot or badge next to the day label in DayCell:
- TSB > 15: green dot + "Forme" tooltip → ready for hard session
- TSB 0 to 15: light green dot + "OK"
- TSB -10 to 0: yellow dot + "Modéré"
- TSB -20 to -10: orange dot + "Fatigue"
- TSB < -20: red dot + "Repos" → needs recovery

Render as a 10px colored circle with optional tooltip text on hover.

---

### Task 4: Cycle overlay component

**Files:**
- Create: `src/components/coach/program-builder/cycle-overlay.tsx`

A colored band at the top of the week grid showing menstrual cycle phases.

```typescript
interface CycleOverlayProps {
  cycleData: { lastPeriodDate: string; avgCycleDays: number; avgPeriodDays: number } | null;
  weekNumber: number;
  programStartDate: string;
}
```

Renders a horizontal strip of 7 small colored segments (one per day of the displayed week):
- Menstruation: red-300
- Follicular: green-300
- Ovulation: amber-300
- Luteal: blue-300

Each segment shows the phase name as a tiny label on hover.

If cycleData is null, renders nothing.

---

### Task 5: Pro mode toggle + settings

**Files:**
- Modify: `src/app/(app)/coach/programs/[id]/page.tsx`

Add a pro mode toggle in the program header:
```tsx
<button onClick={toggleProMode} className="text-xs px-2 py-1 rounded-lg border transition ...">
  {program.pro_mode ? '🔬 Mode Pro' : 'Mode Pro'}
</button>
```

toggleProMode: PATCH `/api/programs/${id}` with `{ pro_mode: !program.pro_mode }`

When pro_mode is true, pass a prop to ProgramBuilder to show advanced overlays.

---

### Task 6: Integrate overlays into ProgramBuilder

**Files:**
- Modify: `src/components/coach/program-builder/program-builder.tsx`
- Modify: `src/components/coach/program-builder/day-cell.tsx`

Add to ProgramBuilder:
```typescript
interface ProgramBuilderProps {
  // ... existing
  proMode?: boolean;
  athleteId?: string; // to fetch cycle data
}
```

When proMode is true:
1. Fetch load analysis from `/api/programs/${programId}/load-analysis` on mount
2. Fetch cycle data from `/api/cycle-tracking` if athleteId is set
3. Pass load data to DayCell as `tsbForDay` prop
4. Render `<CycleOverlay>` above the WeekGrid
5. Render `<LoadOverlay tsb={tsbForDay}>` inside each DayCell

DayCell changes:
- Accept optional `tsb?: number` prop
- If provided, render `<LoadOverlay>` next to the day label

---

### Task 7: Cycle tracking settings page for athletes

**Files:**
- Create: `src/app/(app)/profile/cycle/page.tsx`

Simple page at `/profile/cycle` for athletes to manage their cycle tracking:

- Explanation text: "Le suivi du cycle menstruel permet d'adapter l'intensité de vos entraînements. Ces données sont privées et ne sont partagées qu'avec vos coachs dans le cadre d'un programme."
- Toggle: "Activer le suivi du cycle"
- If enabled:
  - Date picker: "Date des dernières règles"
  - Number input: "Durée moyenne du cycle (jours)" default 28
  - Number input: "Durée moyenne des règles (jours)" default 5
  - Save button
- Consent text: "En activant cette fonctionnalité, vous consentez au traitement de ces données de santé."
- Link back to profile

Add a link to this page from `/profile` page: "Suivi du cycle" with 🔴 icon.

---

### Task 8: Build + push

- Full build: `npx next build`
- Run tests: `npx vitest run`
- Push all commits

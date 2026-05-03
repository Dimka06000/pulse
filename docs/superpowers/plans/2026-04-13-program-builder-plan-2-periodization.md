# Program Builder — Plan 2: Periodization Engine + Program Blocks UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port the VIVO physiological engine (TSS/CTL/ATL/TSB, recommendations) to Pulse, add auto-generation of periodization phases from an event date, and build the timeline bar UI for program blocks.

**Architecture:** Pure TypeScript calculation modules in `src/lib/training/`, a new periodization generator, an API endpoint for load analysis, and React UI components for the timeline bar and block editor.

**Tech Stack:** TypeScript, Vitest, React, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-13-program-builder-design.md`

---

### Task 1: Port load-metrics.ts from VIVO

**Files:**
- Create: `src/lib/training/load-metrics.ts`
- Create: `__tests__/lib/load-metrics.test.ts`

Port the CTL/ATL/TSB calculator from VIVO. The exact code to port:

```typescript
// src/lib/training/load-metrics.ts
import type { LoadHistory } from './types';

const CTL_DECAY = 1 - Math.exp(-1 / 42);
const ATL_DECAY = 1 - Math.exp(-1 / 7);

export interface DailyTSS {
  date: string;
  tss: number;
}

export function calculateLoadMetrics(dailyTSS: DailyTSS[]): {
  ctl: number;
  atl: number;
  tsb: number;
  history: LoadHistory[];
} {
  if (dailyTSS.length === 0) {
    return { ctl: 0, atl: 0, tsb: 0, history: [] };
  }

  const sorted = [...dailyTSS].sort((a, b) => a.date.localeCompare(b.date));
  const filled = fillMissingDays(sorted);

  let ctl = 0;
  let atl = 0;
  const history: LoadHistory[] = [];

  for (const day of filled) {
    ctl = ctl + (day.tss - ctl) * CTL_DECAY;
    atl = atl + (day.tss - atl) * ATL_DECAY;
    history.push({
      date: day.date,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round((ctl - atl) * 10) / 10,
    });
  }

  const latest = history[history.length - 1];
  return {
    ctl: Math.round(latest.ctl),
    atl: Math.round(latest.atl),
    tsb: Math.round(latest.tsb),
    history,
  };
}

function fillMissingDays(sorted: DailyTSS[]): DailyTSS[] {
  if (sorted.length === 0) return [];
  const result: DailyTSS[] = [];
  const start = new Date(sorted[0].date);
  const end = new Date(sorted[sorted.length - 1].date);
  const tssMap = new Map(sorted.map((d) => [d.date, d.tss]));

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    result.push({ date: iso, tss: tssMap.get(iso) ?? 0 });
  }
  return result;
}
```

Test: verify CTL/ATL/TSB calculations with known inputs. Test that empty input returns zeros. Test that missing days are filled.

---

### Task 2: Port tss-calculator.ts from VIVO

**Files:**
- Create: `src/lib/training/tss-calculator.ts`
- Create: `__tests__/lib/tss-calculator.test.ts`

Port the TSS calculator with cascade priority: manual override → hrTSS (TRIMP) → suffer_score → RPE → duration estimate.

```typescript
// src/lib/training/tss-calculator.ts
import type { Activity } from './types';

export interface UserTrainingProfile {
  ftpWatts?: number;
  maxHR?: number;
  restingHR?: number;
}

export function calculateTSS(activity: Activity, profile: UserTrainingProfile): number {
  if (activity.estimatedTss != null && activity.estimatedTss > 0) {
    return activity.estimatedTss;
  }
  if (activity.avgHR && profile.maxHR && profile.restingHR) {
    return hrTSS(activity.duration, activity.avgHR, profile.maxHR, profile.restingHR);
  }
  if (activity.sufferScore != null && activity.sufferScore > 0) {
    return Math.round(activity.sufferScore);
  }
  if (activity.rpe != null && activity.rpe > 0) {
    return Math.round((activity.duration / 60) * activity.rpe * 10);
  }
  return Math.round((activity.duration / 60) * 50);
}

function hrTSS(durationMin: number, avgHR: number, maxHR: number, restingHR: number): number {
  const hrReserve = Math.max(0, Math.min(1, (avgHR - restingHR) / (maxHR - restingHR)));
  const durationHr = durationMin / 60;
  const trimp = durationHr * hrReserve * 0.64 * Math.exp(1.92 * hrReserve);
  return Math.round(trimp * 100);
}
```

Test: verify each cascade level (manual, HR, suffer, RPE, duration).

---

### Task 3: Port recommendations.ts from VIVO

**Files:**
- Create: `src/lib/training/recommendations.ts`
- Create: `__tests__/lib/recommendations.test.ts`

Port the recommendation generator. All messages in French. Categories: recovery, intensity, volume.

Test: verify overtraining warning at TSB < -30, deload suggestion at week 3 of build phase, peak form at TSB > 15.

---

### Task 4: Create periodization generator

**Files:**
- Create: `src/lib/training/periodization.ts`
- Create: `__tests__/lib/periodization.test.ts`

This is NEW code (not in VIVO). Given an event date and a start date, auto-generate periodization phases (mesocycle blocks):

```typescript
export interface PeriodizationInput {
  startDate: string;       // ISO date
  eventDate: string;       // ISO date
  sport: string;           // determines phase distribution
  athleteLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface GeneratedBlock {
  title: string;
  phase: TrainingPhase;
  focus: string;
  weekStart: number;
  weekEnd: number;
  progressionCurve: number[];
  weeklyVolumeMin: number;
  weeklyTSS: number;
}

export function generatePeriodization(input: PeriodizationInput): GeneratedBlock[]
```

Logic:
1. Calculate total weeks between start and event
2. Distribute phases based on total duration:
   - If < 8 weeks: build(60%) → taper(25%) → race(1w) → recovery(rest)
   - If 8-16 weeks: base(30%) → build(35%) → peak(15%) → taper(10%) → race(1w) → recovery(rest)
   - If 16+ weeks: base(25%) → build(30%) → peak(20%) → taper(10%) → race(1w) → recovery(15%)
3. Each block gets a progression curve (e.g., 3 weeks up + 1 deload for build/peak)
4. Volume/TSS targets scale by athlete level (beginner: ×0.6, intermediate: ×0.8, advanced: ×1.0)
5. Add 2-week recovery block after race

Test: verify phase distribution for 12-week, 20-week, and 6-week programs.

---

### Task 5: Load analysis API endpoint

**Files:**
- Create: `src/app/api/programs/[id]/load-analysis/route.ts`

GET endpoint that:
1. Fetches all program_workouts for the program
2. Estimates TSS per workout from workout_data (use exercise count × intensity_percent as proxy)
3. Calculates projected CTL/ATL/TSB across the program duration
4. Returns: `{ history: LoadHistory[], recommendations: Recommendation[], currentMetrics: { ctl, atl, tsb } }`

Follow existing API auth pattern from programs/[id]/workouts/route.ts.

---

### Task 6: Periodization auto-generate API endpoint

**Files:**
- Create: `src/app/api/programs/[id]/periodize/route.ts`

POST endpoint:
- Input: `{ startDate, eventDate, sport, athleteLevel }`
- Calls `generatePeriodization()` from Task 4
- Creates `program_blocks` rows in DB for each generated block
- Updates `training_programs.duration_weeks` to match total weeks
- Returns created blocks

---

### Task 7: Timeline bar component

**Files:**
- Create: `src/components/coach/program-builder/timeline-bar.tsx`

A horizontal bar showing mesocycle blocks for a program. Port visual concept from VIVO's `periodization-timeline.tsx`.

Props:
```typescript
interface TimelineBarProps {
  blocks: ProgramBlock[];
  totalWeeks: number;
  activeWeek: number;
  onBlockClick: (block: ProgramBlock) => void;
  onAddBlock: () => void;
}
```

Visual:
- Horizontal bar divided into colored segments (one per block)
- Phase colors: base=#3B82F6, build=#F59E0B, peak=#EF4444, taper=#10B981, race=#F59E0B, recovery=#8B5CF6
- Each segment width proportional to its week range
- Active week marker (triangle/line indicator)
- Click on segment → onBlockClick
- "+" button at end → onAddBlock
- Below the bar: week numbers (1, 2, 3...)

---

### Task 8: Block editor modal

**Files:**
- Create: `src/components/coach/program-builder/block-editor-modal.tsx`

Modal for creating/editing a mesocycle block. Single-page modal (same pattern as routine-editor-modal).

Fields:
- Title (Input)
- Phase selector: 6 pill buttons (base/build/peak/taper/race/recovery) with phase colors
- Focus selector: 6 pill buttons (hypertrophy/strength/endurance/power/recovery/general)
- Week start / Week end (number inputs)
- Progression curve: visual pill row showing intensity % per week within the block. Example for a 4-week block: [70, 80, 85, 60]. Editable — each week is a small number input.

Uses POST /api/programs/[id]/blocks to create, PATCH to update.

---

### Task 9: Integrate timeline + blocks into program detail page

**Files:**
- Modify: `src/app/(app)/coach/programs/[id]/page.tsx`

Add the timeline bar above the existing week grid (only visible when program has blocks OR pro_mode is enabled):
1. Fetch blocks from `/api/programs/[id]/blocks` on page load
2. Render `<TimelineBar>` above the week tabs
3. Click on a block → opens BlockEditorModal in edit mode
4. "+" on timeline → opens BlockEditorModal in create mode
5. Add "Auto-periodiser" button that calls POST /api/programs/[id]/periodize with the program's sport, duration, and a default athlete level

---

### Task 10: Build + push

- Full build check: `npx next build`
- Push all commits
- Verify Vercel deployment

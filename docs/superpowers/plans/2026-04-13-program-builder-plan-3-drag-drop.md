# Program Builder — Plan 3: Drag & Drop Program Composition

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Install dnd-kit and build the drag & drop program builder UI: a session/routine library panel on the left, a week grid on the right, with drag from library to grid to compose programs.

**Architecture:** `@dnd-kit/core` + `@dnd-kit/sortable` for drag interactions. New page layout for program detail with collapsible library panel + grid. Draggable session cards, droppable day cells. Exercise reordering within workout editor also uses sortable.

**Tech Stack:** @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, React, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-13-program-builder-design.md`

---

### Task 1: Install dnd-kit

**Files:**
- Modify: `package.json`

- [ ] Install dnd-kit packages:
```bash
cd "/c/Users/dimit/OneDrive/Documents/Projets et Entreprises/Projets perso/Coding/pulse"
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] Commit:
```bash
git add package.json package-lock.json
git commit -m "chore: install @dnd-kit/core, sortable, utilities for drag & drop"
```

---

### Task 2: Draggable session card component

**Files:**
- Create: `src/components/coach/program-builder/draggable-session-card.tsx`

A card representing a session template that can be dragged from the library panel. Uses `useDraggable` from `@dnd-kit/core`.

```typescript
'use client';
import { useDraggable } from '@dnd-kit/core';

interface DraggableSessionCardProps {
  session: {
    id: string;
    title: string;
    sport: string;
    duration: number;
    type: string;
  };
}
```

Visual: compact card (~60px height) with sport emoji, title, duration badge. When dragging, shows a semi-transparent ghost. Uses `transform` from `@dnd-kit/utilities` for drag position.

Also create a variant for routines (same component, different icon/color — use a `kind: 'session' | 'routine'` prop).

---

### Task 3: Session library panel

**Files:**
- Create: `src/components/coach/program-builder/session-library.tsx`

Left panel listing the coach's session templates and routines as draggable cards.

```typescript
interface SessionLibraryProps {
  sessions: SessionTemplate[];
  routines: Routine[];
  onCreateSession: () => void;
  onCreateRoutine: () => void;
}
```

Features:
- Collapsible panel (toggle button to hide/show on desktop, drawer on mobile)
- Two sections: "Mes séances" and "Mes routines" with counts
- Search input at top to filter by title
- Each item renders as `<DraggableSessionCard>`
- "+ Nouvelle séance" and "+ Nouvelle routine" buttons at bottom of each section
- Fetches sessions from `/api/coaches/me/sessions` and routines from `/api/routines` on mount

---

### Task 4: Droppable day cell

**Files:**
- Create: `src/components/coach/program-builder/day-cell.tsx`

A day cell in the week grid that accepts dropped sessions/routines. Uses `useDroppable` from `@dnd-kit/core`.

```typescript
interface DayCellProps {
  weekNumber: number;
  dayNumber: number;
  dayLabel: string;
  workouts: ProgramWorkout[];
  isOver: boolean;
  onAddWorkout: (weekNumber: number, dayNumber: number) => void;
  onClickWorkout: (workout: ProgramWorkout) => void;
  onDeleteWorkout: (workoutId: string) => void;
}
```

Visual:
- Rounded card with day label header (Lun, Mar, Mer...)
- Lists existing workouts as small colored cards (sport gradient bar, title, duration)
- When a draggable is over this cell: green dashed border + "Déposer ici" hint
- Empty cells show a ghost "+ Ajouter" on hover
- Click on existing workout → onClickWorkout (opens editor)

---

### Task 5: Week grid component

**Files:**
- Create: `src/components/coach/program-builder/week-grid.tsx`

The main grid showing 7 day columns for the active week.

```typescript
interface WeekGridProps {
  weekNumber: number;
  workouts: ProgramWorkout[];
  onAddWorkout: (weekNumber: number, dayNumber: number) => void;
  onClickWorkout: (workout: ProgramWorkout) => void;
  onDeleteWorkout: (workoutId: string) => void;
}
```

Renders 7 `<DayCell>` components in a responsive grid (7 columns on desktop, 2 on mobile with scroll).

---

### Task 6: Program builder layout (main component)

**Files:**
- Create: `src/components/coach/program-builder/program-builder.tsx`

The main builder wrapping everything in a `DndContext` from `@dnd-kit/core`.

```typescript
interface ProgramBuilderProps {
  program: Program;
  workouts: ProgramWorkout[];
  blocks: ProgramBlock[];
  onWorkoutsChange: () => void;
}
```

Layout:
- `DndContext` wrapper with `onDragEnd` handler
- Left: `<SessionLibrary>` (collapsible)
- Right: `<WeekGrid>` for active week
- Above grid: week tabs (S1, S2...) + `<TimelineBar>` if blocks exist

`onDragEnd` handler:
1. Get the dragged item data (session_template_id or routine_id + metadata)
2. Get the drop target (weekNumber + dayNumber)
3. POST to `/api/programs/[id]/workouts` with:
   - week_number, day_number from drop target
   - title from the dragged session
   - session_template_id (if session)
   - routine_warmup_id or routine_cooldown_id (if routine, based on routine type)
   - workout_data copied from session's exercises if available
   - duration_minutes from session
4. Refresh workouts list

DragOverlay: renders a floating ghost of the dragged card during drag.

---

### Task 7: Integrate program builder into program detail page

**Files:**
- Modify: `src/app/(app)/coach/programs/[id]/page.tsx`

Replace the current inline week grid + day cards with the new `<ProgramBuilder>` component.

Keep:
- Header with program info + action buttons (publish, assign, delete, auto-periodize)
- TimelineBar (already integrated from Plan 2)
- WorkoutEditorModal (already exists)
- BlockEditorModal (already exists)

Replace:
- The manual week tabs + 7-day grid + inline workout cards → `<ProgramBuilder>`
- Wire up: when ProgramBuilder calls onWorkoutsChange, refetch program data

Fetch sessions and routines on page load (for the library panel).

---

### Task 8: Sortable exercises within workout editor

**Files:**
- Modify: `src/components/coach/exercise-builder.tsx`

Replace the manual up/down arrow buttons with `@dnd-kit/sortable` for exercise reordering within a workout.

Use `SortableContext` + `useSortable` on each exercise row. Drag handle (grip icon) on the left of each exercise. Visual feedback during reorder (item lifts, gap appears).

Keep the existing add/remove/edit functionality unchanged — only the reorder mechanism changes from arrows to drag.

---

### Task 9: Build + push

- Full build: `npx next build`
- Run existing tests: `npx vitest run`
- Push all commits
- Verify Vercel deployment

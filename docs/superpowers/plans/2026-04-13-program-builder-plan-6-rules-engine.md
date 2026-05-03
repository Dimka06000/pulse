# Program Builder — Plan 6: Rules Engine UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the UI for creating, editing, and managing conditional rules that auto-modify programs (insert routines before sessions, deload every Nth week, adjust intensity by cycle phase, alert on TSB thresholds).

**Architecture:** Rules panel in the program builder (pro mode), rule editor modal with trigger/condition/action builder, rule execution preview showing which sessions would be affected.

**Tech Stack:** React, Tailwind CSS, existing `/api/programs/[id]/rules` CRUD API (already built in Plan 1)

**Spec:** `docs/superpowers/specs/2026-04-13-program-builder-design.md`

---

### Task 1: Rule editor modal

**Files:**
- Create: `src/components/coach/program-builder/rule-editor-modal.tsx`

Modal for creating/editing a program rule. Single-page modal (same pattern as block-editor-modal).

```typescript
'use client';

interface ProgramRule {
  id: string;
  title: string;
  trigger: string;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
  is_active: boolean;
}

interface RuleEditorModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (rule: ProgramRule) => void;
  programId: string;
  editRule?: ProgramRule | null;
}
```

UI layout — 3 sections in the modal:

**1. Titre** — Input for rule name

**2. Déclencheur (trigger + condition)**

Trigger selector: 6 pill buttons with French labels:
- `before_session` → "Avant chaque séance"
- `every_nth_week` → "Toutes les N semaines"
- `tsb_threshold` → "Seuil de fatigue (TSB)"
- `cycle_phase` → "Phase du cycle"
- `after_race` → "Après compétition"
- `always` → "Toujours"

Condition builder (changes based on trigger):
- `before_session`: dropdown "Type de séance" → strength/cardio/all. Stored as `{ session_type: "strength" }`
- `every_nth_week`: number input "Toutes les ___ semaines". Stored as `{ week_mod: 4 }`
- `tsb_threshold`: number input "Quand TSB inférieur à ___". Stored as `{ tsb_below: -20 }`
- `cycle_phase`: dropdown "Phase" → menstruation/follicular/ovulation/luteal. Stored as `{ phase: "luteal" }`
- `after_race`: no condition needed. Stored as `{}`
- `always`: no condition needed. Stored as `{}`

**3. Action**

Action type selector: 4 pill buttons:
- `insert_routine` → "Insérer une routine"
- `reduce_intensity` → "Réduire l'intensité"
- `swap_session` → "Remplacer la séance"
- `alert` → "Alerte"

Action config (changes based on type):
- `insert_routine`: dropdown listing coach's routines (fetch from /api/routines). Stored as `{ type: "insert_routine", routine_id: "xxx", routine_title: "Échauffement" }`
- `reduce_intensity`: number input "Réduire de ___%" (default 15). Stored as `{ type: "reduce_intensity", percent: 15 }`
- `swap_session`: text input "Remplacer par" (e.g., "Récupération active"). Stored as `{ type: "swap_session", replacement: "Récupération active" }`
- `alert`: text input "Message d'alerte". Stored as `{ type: "alert", message: "..." }`

**Footer**: Annuler + Créer/Enregistrer

API: POST `/api/programs/${programId}/rules` to create, PATCH to update (rule_id in body).

---

### Task 2: Rules panel component

**Files:**
- Create: `src/components/coach/program-builder/rules-panel.tsx`

A panel listing all rules for a program, shown in pro mode.

```typescript
interface RulesPanelProps {
  rules: ProgramRule[];
  onAddRule: () => void;
  onEditRule: (rule: ProgramRule) => void;
  onDeleteRule: (ruleId: string) => void;
  onToggleRule: (ruleId: string, active: boolean) => void;
}
```

Visual:
- Header: "Règles" + count badge + "+" add button
- Each rule as a card:
  - Title (bold)
  - Trigger + condition summary in small gray text (French readable: "Avant chaque séance de force → Insérer Échauffement mobilité")
  - Action summary with colored badge (green for insert, orange for reduce, blue for swap, red for alert)
  - Toggle switch for is_active (calls onToggleRule)
  - Edit button (pencil icon) → onEditRule
  - Delete button (trash icon) → onDeleteRule with inline confirmation
- Empty state: "Aucune règle — Les règles permettent d'automatiser votre programme"

Helper function to generate readable summaries:
```typescript
function describeTrigger(trigger: string, condition: Record<string, unknown>): string
function describeAction(action: Record<string, unknown>): string
```

---

### Task 3: Integrate rules into ProgramBuilder

**Files:**
- Modify: `src/components/coach/program-builder/program-builder.tsx`
- Modify: `src/app/(app)/coach/programs/[id]/page.tsx`

In ProgramBuilder:
1. Add state: `rules`, `ruleEditorOpen`, `editRule`
2. When proMode is true, fetch rules from `/api/programs/${programId}/rules` on mount
3. Render `<RulesPanel>` below the WeekGrid (only in pro mode)
4. Wire up handlers:
   - onAddRule: open rule editor modal
   - onEditRule: open editor with editRule
   - onDeleteRule: DELETE `/api/programs/${programId}/rules?rule_id=xxx`
   - onToggleRule: PATCH `/api/programs/${programId}/rules` with `{ rule_id, is_active }`
5. Render `<RuleEditorModal>` at bottom of JSX

---

### Task 4: Pre-built rule templates

**Files:**
- Create: `src/lib/training/rule-templates.ts`

Common rule presets that coaches can one-click add:

```typescript
export interface RuleTemplate {
  title: string;
  description: string;
  trigger: string;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
}

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    title: 'Échauffement avant chaque séance de force',
    description: 'Insère automatiquement une routine d\'échauffement',
    trigger: 'before_session',
    condition: { session_type: 'strength' },
    action: { type: 'insert_routine', routine_id: '', routine_title: 'Échauffement' },
  },
  {
    title: 'Deload toutes les 4 semaines',
    description: 'Réduit l\'intensité de 40% toutes les 4 semaines',
    trigger: 'every_nth_week',
    condition: { week_mod: 4 },
    action: { type: 'reduce_intensity', percent: 40 },
  },
  {
    title: 'Alerte fatigue',
    description: 'Alerte quand la fatigue est trop élevée (TSB < -20)',
    trigger: 'tsb_threshold',
    condition: { tsb_below: -20 },
    action: { type: 'alert', message: 'Fatigue élevée — envisagez une journée de repos' },
  },
  {
    title: 'Adaptation phase lutéale',
    description: 'Réduit l\'intensité de 15% pendant la phase lutéale',
    trigger: 'cycle_phase',
    condition: { phase: 'luteal' },
    action: { type: 'reduce_intensity', percent: 15 },
  },
  {
    title: 'Récupération post-compétition',
    description: 'Remplace les séances par de la récupération active après une course',
    trigger: 'after_race',
    condition: {},
    action: { type: 'swap_session', replacement: 'Récupération active — mobilité et marche' },
  },
];
```

Add a "Règles suggérées" section in RulesPanel that shows template cards (only when the program has < 3 rules). One-click to add (POST to API).

---

### Task 5: Build + push

- Full build: `npx next build`
- Run tests: `npx vitest run`
- Push all commits
- Verify deployment

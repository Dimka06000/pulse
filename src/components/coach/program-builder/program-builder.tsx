'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SessionLibrary } from './session-library';
import { WeekGrid } from './week-grid';
import { CycleOverlay } from './cycle-overlay';
import { RulesPanel } from './rules-panel';
import { AdjustmentPanel } from './adjustment-panel';
import { FeedbackPanel } from './feedback-panel';
import { RuleEditorModal, type ProgramRule } from './rule-editor-modal';
import { LoadChart } from './load-chart';
import { SPORT_EMOJIS, type Sport } from '@/lib/sports';
import type { DraggableItem } from './draggable-session-card';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Workout {
  id: string;
  week_number: number;
  day_number: number;
  title: string;
  description?: string;
  workout_data: { exercises: Array<Record<string, unknown>> };
  duration_minutes: number;
  session_template_id?: string | null;
  routine_warmup_id?: string | null;
  routine_cooldown_id?: string | null;
}

interface ProgramBuilderProps {
  programId: string;
  program: {
    id: string;
    title: string;
    sport: string;
    duration_weeks: number;
    pro_mode?: boolean;
  };
  initialWorkouts: Workout[];
  blocks: Array<{
    id: string;
    title: string;
    phase: string;
    focus: string;
    week_start: number;
    week_end: number;
    order_index: number;
    progression_curve: number[];
  }>;
  onWorkoutsChange: () => void;
  onClickWorkout: (workout: Workout) => void;
  onDeleteWorkout: (workoutId: string) => void;
  proMode?: boolean;
  athleteId?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ProgramBuilder({
  programId,
  program,
  initialWorkouts,
  blocks,
  onWorkoutsChange,
  onClickWorkout,
  onDeleteWorkout,
  proMode,
  athleteId,
}: ProgramBuilderProps) {
  const [activeWeek, setActiveWeek] = useState(1);
  const [workouts, setWorkouts] = useState<Workout[]>(initialWorkouts || []);
  const [activeDrag, setActiveDrag] = useState<DraggableItem | null>(null);
  const [sessions, setSessions] = useState<DraggableItem[]>([]);
  const [routines, setRoutines] = useState<DraggableItem[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  // Pro mode data
  const [loadData, setLoadData] = useState<{ history: { date: string; ctl: number; atl: number; tsb: number }[] } | null>(null);
  const [cycleData, setCycleData] = useState<{ lastPeriodDate: string; avgCycleDays: number; avgPeriodDays: number } | null>(null);

  // Rules state
  const [rules, setRules] = useState<ProgramRule[]>([]);
  const [ruleEditorOpen, setRuleEditorOpen] = useState(false);
  const [editRule, setEditRule] = useState<ProgramRule | null>(null);
  const [routinesList, setRoutinesList] = useState<{ id: string; title: string; type: string }[]>([]);

  // Fetch pro mode data when enabled
  useEffect(() => {
    if (!proMode) { setLoadData(null); setCycleData(null); setRules([]); return; }

    fetch(`/api/programs/${programId}/load-analysis`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setLoadData)
      .catch(() => setLoadData(null));

    if (athleteId) {
      fetch('/api/cycle-tracking')
        .then((r) => (r.ok ? r.json() : null))
        .then(setCycleData)
        .catch(() => setCycleData(null));
    }

    fetch(`/api/programs/${programId}/rules`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setRules)
      .catch(() => setRules([]));
  }, [proMode, programId, athleteId]);

  // Sync workouts when initialWorkouts changes (after refetch)
  useEffect(() => {
    setWorkouts(initialWorkouts || []);
  }, [initialWorkouts]);

  // Fetch sessions and routines on mount
  useEffect(() => {
    fetch('/api/coaches/me/sessions')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Array<Record<string, unknown>>) => {
        setSessions(
          data.map((s) => ({
            id: String(s.id),
            kind: 'session' as const,
            title: String(s.title || ''),
            duration: Number(s.duration_minutes || 60),
            sport: String(s.sport || ''),
            type: String(s.type || ''),
          }))
        );
      })
      .catch(() => setSessions([]));

    fetch('/api/routines')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Array<Record<string, unknown>>) => {
        const mapped = data.map((r) => ({
          id: String(r.id),
          kind: 'routine' as const,
          title: String(r.title || ''),
          duration: Number(r.duration_minutes || 15),
          sport: String(r.sport || ''),
          type: String(r.type || ''),
        }));
        setRoutines(mapped);
        setRoutinesList(mapped.map((r) => ({ id: r.id, title: r.title, type: r.type })));
      })
      .catch(() => setRoutines([]));
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const item = event.active.data.current as DraggableItem | undefined;
    setActiveDrag(item || null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveDrag(null);

      const item = event.active.data.current as DraggableItem | undefined;
      const overId = event.over?.id as string | undefined;

      if (!item || !overId) return;

      // Parse drop target: format "drop-{weekNumber}-{dayNumber}"
      const match = String(overId).match(/^drop-(\d+)-(\d+)$/);
      if (!match) return;

      const weekNumber = parseInt(match[1], 10);
      const dayNumber = parseInt(match[2], 10);

      const warmupTypes = ['warmup', 'activation', 'mobility'];
      const cooldownTypes = ['cooldown', 'prehab', 'core'];

      const payload = {
        week_number: weekNumber,
        day_number: dayNumber,
        title: item.title,
        duration_minutes: item.duration,
        session_template_id: item.kind === 'session' ? item.id : null,
        routine_warmup_id:
          item.kind === 'routine' && warmupTypes.includes(item.type)
            ? item.id
            : null,
        routine_cooldown_id:
          item.kind === 'routine' && cooldownTypes.includes(item.type)
            ? item.id
            : null,
        workout_data: { exercises: [] },
      };

      try {
        const res = await fetch(`/api/programs/${programId}/workouts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const newWorkout = await res.json();
          setWorkouts((prev) => [...prev, newWorkout]);
          onWorkoutsChange();
        }
      } catch {
        // Silently fail — user will see the card didn't appear
      }
    },
    [programId, onWorkoutsChange]
  );

  async function handleDeleteRule(ruleId: string) {
    const res = await fetch(`/api/programs/${programId}/rules?rule_id=${ruleId}`, { method: 'DELETE' });
    if (res.ok) setRules(prev => prev.filter(r => r.id !== ruleId));
  }

  async function handleToggleRule(ruleId: string, active: boolean) {
    const res = await fetch(`/api/programs/${programId}/rules`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule_id: ruleId, is_active: active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
    }
  }

  async function handleAddTemplate(template: Record<string, unknown>) {
    const res = await fetch(`/api/programs/${programId}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    if (res.ok) {
      const created = await res.json();
      setRules(prev => [...prev, created]);
    }
  }

  const weeks = Array.from({ length: program.duration_weeks }, (_, i) => i + 1);
  const weekWorkouts = workouts.filter((w) => w.week_number === activeWeek);
  const sportEmoji = SPORT_EMOJIS[program.sport as Sport] || '⚡';
  const programStartDate = new Date().toISOString().slice(0, 10);

  // Calculate TSB per day for the active week from loadData
  const tsbByDay: Record<number, number> | undefined = (() => {
    if (!proMode || !loadData?.history?.length) return undefined;
    const startMs = new Date(programStartDate).getTime();
    const weekOffsetDays = (activeWeek - 1) * 7;
    const result: Record<number, number> = {};
    for (let d = 1; d <= 7; d++) {
      const dateMs = startMs + (weekOffsetDays + (d - 1)) * 24 * 60 * 60 * 1000;
      const iso = new Date(dateMs).toISOString().slice(0, 10);
      // Find closest TSB entry on or before this date
      let closestTsb: number | undefined;
      for (const entry of loadData.history) {
        if (entry.date <= iso) closestTsb = entry.tsb;
        else break;
      }
      if (closestTsb !== undefined) result[d] = closestTsb;
    }
    return Object.keys(result).length > 0 ? result : undefined;
  })();

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-0 h-full">
        {/* Left: Session Library */}
        <div
          className={`${
            libraryOpen ? 'w-72 border-r border-border' : 'w-0'
          } shrink-0 transition-all overflow-hidden bg-white`}
        >
          {libraryOpen && (
            <SessionLibrary
              sessions={sessions}
              routines={routines}
              onToggle={() => setLibraryOpen(false)}
            />
          )}
        </div>

        {/* Library toggle (when closed) */}
        {!libraryOpen && (
          <button
            onClick={() => setLibraryOpen(true)}
            className="shrink-0 flex items-center justify-center w-8 border-r border-border bg-surface hover:bg-gray-100 transition text-muted"
            title="Ouvrir la bibliothèque"
          >
            <span className="text-xs rotate-90 whitespace-nowrap">Bibliothèque</span>
          </button>
        )}

        {/* Right: Week tabs + Grid */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Week tabs */}
          <div className="flex gap-1 overflow-x-auto items-center px-4 py-3 border-b border-border bg-white">
            {weeks.map((w) => {
              const hasWorkouts = workouts.some((wo) => wo.week_number === w);
              return (
                <button
                  key={w}
                  onClick={() => setActiveWeek(w)}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    w === activeWeek
                      ? 'bg-gradient-to-r from-brand-500 to-cyan-500 text-white'
                      : 'bg-surface text-muted hover:text-text'
                  }`}
                >
                  S{w}
                  {hasWorkouts && w !== activeWeek && (
                    <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-brand-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Week grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {proMode && cycleData && (
              <CycleOverlay
                cycleData={cycleData}
                weekNumber={activeWeek}
                programStartDate={programStartDate}
              />
            )}
            {proMode && loadData?.history?.length && (
              <LoadChart
                history={loadData.history}
                blocks={blocks?.map((b) => ({ phase: b.phase, weekStart: b.week_start, weekEnd: b.week_end }))}
                totalWeeks={program.duration_weeks}
              />
            )}
            <WeekGrid
              weekNumber={activeWeek}
              workouts={weekWorkouts}
              onClickWorkout={onClickWorkout}
              onDeleteWorkout={onDeleteWorkout}
              tsbByDay={tsbByDay}
            />
            {proMode && (
              <AdjustmentPanel
                programId={programId}
                onAdjustmentsApplied={onWorkoutsChange}
              />
            )}
            {proMode && (
              <RulesPanel
                rules={rules}
                onAddRule={() => { setEditRule(null); setRuleEditorOpen(true); }}
                onEditRule={(rule) => { setEditRule(rule); setRuleEditorOpen(true); }}
                onDeleteRule={handleDeleteRule}
                onToggleRule={handleToggleRule}
                onAddTemplate={handleAddTemplate}
              />
            )}
            {proMode && (
              <FeedbackPanel
                programId={programId}
                activeWeek={activeWeek}
                athleteId={athleteId}
              />
            )}
          </div>
        </div>
      </div>

      {/* Rule editor modal */}
      <RuleEditorModal
        open={ruleEditorOpen}
        onClose={() => { setRuleEditorOpen(false); setEditRule(null); }}
        onSaved={(saved) => {
          if (editRule) {
            setRules(prev => prev.map(r => r.id === saved.id ? saved : r));
          } else {
            setRules(prev => [...prev, saved]);
          }
          setRuleEditorOpen(false);
          setEditRule(null);
        }}
        programId={programId}
        routines={routinesList}
        editRule={editRule}
      />

      {/* Drag overlay — floating ghost */}
      <DragOverlay>
        {activeDrag ? (
          <div className="rounded-lg bg-white shadow-xl border border-brand-300 px-4 py-3 opacity-90 pointer-events-none max-w-[200px]">
            <div className="flex items-center gap-2">
              <span className="text-lg">{sportEmoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text truncate">
                  {activeDrag.title}
                </p>
                <p className="text-xs text-muted">
                  {activeDrag.duration} min
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface ExerciseItem {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  rest_seconds?: number;
  duration_minutes?: number;
}

interface ExerciseBuilderProps {
  sport: string;
  exercises: ExerciseItem[];
  onChange: (exercises: ExerciseItem[]) => void;
}

// ─── Exercise presets by sport ──────────────────────────────────────────────
const EXERCISE_PRESETS: Record<string, string[]> = {
  musculation: ['Squats', 'Développé couché', 'Tractions', 'Soulevé de terre', 'Rowing', 'Curl biceps', 'Dips', 'Fentes'],
  crossfit: ['Burpees', 'Box jumps', 'Thrusters', 'Wall balls', 'Double-unders', 'Toes to bar', 'Clean & jerk'],
  yoga: ['Salutation au soleil', 'Guerrier I', 'Guerrier II', 'Chien tête en bas', 'Planche', 'Pont'],
  running: ['Course continue', 'Fractionné', 'Côtes', 'Tempo run', 'Récupération'],
  cyclisme: ['Sortie endurance', 'Intervalles', 'Côtes', 'Tempo', 'Récupération'],
  natation: ['Crawl continu', 'Séries 100m', 'Dos', 'Brasse', 'Éducatifs'],
  boxe: ['Shadow boxing', 'Sac lourd', 'Corde à sauter', "Pattes d'ours", 'Sparring'],
  fitness: ['Gainage', 'Pompes', 'Abdos', 'Mountain climbers', 'Jumping jacks'],
};

const CARDIO_SPORTS = ['running', 'cyclisme', 'natation', 'yoga'];

// ─── Sortable exercise row ───────────────────────────────────────────────────
interface SortableExerciseRowProps {
  exercise: ExerciseItem;
  onRemove: () => void;
  onUpdate: (updates: Partial<ExerciseItem>) => void;
}

function SortableExerciseRow({ exercise, onRemove, onUpdate }: SortableExerciseRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex gap-2"
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex items-start pt-0.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
        title="Réorganiser"
        aria-label="Réorganiser cet exercice"
      >
        <span className="text-lg leading-none select-none">⠿</span>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-800 truncate">{exercise.name}</span>
          <button
            type="button"
            onClick={onRemove}
            className="h-6 w-6 flex items-center justify-center rounded text-red-400 hover:bg-red-100 text-xs ml-2 flex-shrink-0"
            title="Supprimer"
          >
            ✕
          </button>
        </div>

        {/* Inline editors */}
        <div className="flex gap-2">
          {exercise.duration_minutes !== undefined ? (
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 block mb-0.5">Durée (min)</label>
              <input
                type="number"
                min={1}
                value={exercise.duration_minutes}
                onChange={(e) => onUpdate({ duration_minutes: Number(e.target.value) })}
                className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              />
            </div>
          ) : (
            <>
              <div className="flex-1">
                <label className="text-[10px] text-gray-500 block mb-0.5">Séries</label>
                <input
                  type="number"
                  min={1}
                  value={exercise.sets || 3}
                  onChange={(e) => onUpdate({ sets: Number(e.target.value) })}
                  className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-500 block mb-0.5">Reps</label>
                <input
                  type="number"
                  min={1}
                  value={exercise.reps || 10}
                  onChange={(e) => onUpdate({ reps: Number(e.target.value) })}
                  className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-500 block mb-0.5">Repos (s)</label>
                <input
                  type="number"
                  min={0}
                  step={15}
                  value={exercise.rest_seconds || 90}
                  onChange={(e) => onUpdate({ rest_seconds: Number(e.target.value) })}
                  className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────
export function ExerciseBuilder({ sport, exercises, onChange }: ExerciseBuilderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const isCardio = CARDIO_SPORTS.includes(sport);

  const allPresets = useMemo(() => {
    const sportExercises = EXERCISE_PRESETS[sport] || [];
    const allExercises = new Set<string>(sportExercises);
    if (sport !== 'fitness') {
      (EXERCISE_PRESETS['fitness'] || []).forEach((e) => allExercises.add(e));
    }
    return Array.from(allExercises);
  }, [sport]);

  const quickChips = EXERCISE_PRESETS[sport] || EXERCISE_PRESETS['fitness'] || [];

  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allPresets.filter(
      (e) =>
        e.toLowerCase().includes(q) &&
        !exercises.some((ex) => ex.name === e)
    );
  }, [searchQuery, allPresets, exercises]);

  function addExercise(name: string) {
    if (exercises.some((e) => e.name === name)) return;
    const newExercise: ExerciseItem = isCardio
      ? { id: crypto.randomUUID(), name, duration_minutes: 10 }
      : { id: crypto.randomUUID(), name, sets: 3, reps: 10, rest_seconds: 90 };
    onChange([...exercises, newExercise]);
    setSearchQuery('');
  }

  function addCustomExercise() {
    const name = searchQuery.trim();
    if (!name || exercises.some((e) => e.name === name)) return;
    addExercise(name);
  }

  function removeExercise(index: number) {
    onChange(exercises.filter((_, i) => i !== index));
  }

  function updateExercise(index: number, updates: Partial<ExerciseItem>) {
    onChange(
      exercises.map((ex, i) => (i === index ? { ...ex, ...updates } : ex))
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = exercises.findIndex((ex) => ex.id === active.id);
    const newIndex = exercises.findIndex((ex) => ex.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const arr = [...exercises];
    const [moved] = arr.splice(oldIndex, 1);
    arr.splice(newIndex, 0, moved);
    onChange(arr);
  }

  const ids = exercises.map((ex) => ex.id);

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">Exercices</label>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {quickChips.map((name) => {
          const alreadyAdded = exercises.some((e) => e.name === name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => !alreadyAdded && addExercise(name)}
              disabled={alreadyAdded}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                alreadyAdded
                  ? 'bg-brand-100 text-brand-600 opacity-60 cursor-default'
                  : 'bg-gray-100 text-gray-700 hover:bg-brand-50 hover:text-brand-600'
              }`}
            >
              {alreadyAdded ? '✓ ' : '+ '}{name}
            </button>
          );
        })}
      </div>

      {/* Custom exercise input with autocomplete */}
      <div className="relative">
        <Input
          placeholder="Ajouter un exercice..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (filteredSuggestions.length > 0) {
                addExercise(filteredSuggestions[0]);
              } else if (searchQuery.trim()) {
                addCustomExercise();
              }
            }
          }}
        />
        {filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
            {filteredSuggestions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => addExercise(name)}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-600 transition"
              >
                {name}
              </button>
            ))}
          </div>
        )}
        {searchQuery.trim() && filteredSuggestions.length === 0 && (
          <button
            type="button"
            onClick={addCustomExercise}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 transition text-left"
          >
            + Ajouter &ldquo;{searchQuery.trim()}&rdquo;
          </button>
        )}
      </div>

      {/* Exercise list */}
      {exercises.length > 0 && (
        <div className="mt-4 space-y-2">
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {exercises.map((ex, i) => (
                <SortableExerciseRow
                  key={ex.id}
                  exercise={ex}
                  onRemove={() => removeExercise(i)}
                  onUpdate={(updates) => updateExercise(i, updates)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {exercises.length === 0 && (
        <p className="mt-3 text-xs text-gray-400 text-center py-4">
          Cliquez sur les exercices ci-dessus ou tapez un nom pour en ajouter
        </p>
      )}
    </div>
  );
}

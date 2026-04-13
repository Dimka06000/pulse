'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface ExerciseItem {
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

// ─── Component ──────────────────────────────────────────────────────────────
export function ExerciseBuilder({ sport, exercises, onChange }: ExerciseBuilderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const isCardio = CARDIO_SPORTS.includes(sport);

  // Get all available exercises for autocomplete
  const allPresets = useMemo(() => {
    const sportExercises = EXERCISE_PRESETS[sport] || [];
    const allExercises = new Set<string>(sportExercises);
    // Also add fitness basics as fallback
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
      ? { name, duration_minutes: 10 }
      : { name, sets: 3, reps: 10, rest_seconds: 90 };
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

  function moveExercise(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= exercises.length) return;
    const arr = [...exercises];
    [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
    onChange(arr);
  }

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
          {exercises.map((ex, i) => (
            <div
              key={`${ex.name}-${i}`}
              className="rounded-xl border border-gray-200 bg-gray-50 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">{ex.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveExercise(i, -1)}
                    disabled={i === 0}
                    className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-200 disabled:opacity-30 text-xs"
                    title="Monter"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveExercise(i, 1)}
                    disabled={i === exercises.length - 1}
                    className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-200 disabled:opacity-30 text-xs"
                    title="Descendre"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => removeExercise(i)}
                    className="h-6 w-6 flex items-center justify-center rounded text-red-400 hover:bg-red-100 text-xs"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Inline editors */}
              <div className="flex gap-2">
                {ex.duration_minutes !== undefined ? (
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500 block mb-0.5">Durée (min)</label>
                    <input
                      type="number"
                      min={1}
                      value={ex.duration_minutes}
                      onChange={(e) =>
                        updateExercise(i, { duration_minutes: Number(e.target.value) })
                      }
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
                        value={ex.sets || 3}
                        onChange={(e) =>
                          updateExercise(i, { sets: Number(e.target.value) })
                        }
                        className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 block mb-0.5">Reps</label>
                      <input
                        type="number"
                        min={1}
                        value={ex.reps || 10}
                        onChange={(e) =>
                          updateExercise(i, { reps: Number(e.target.value) })
                        }
                        className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 block mb-0.5">Repos (s)</label>
                      <input
                        type="number"
                        min={0}
                        step={15}
                        value={ex.rest_seconds || 90}
                        onChange={(e) =>
                          updateExercise(i, { rest_seconds: Number(e.target.value) })
                        }
                        className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
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

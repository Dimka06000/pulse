'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface ExerciseItem {
  name: string;
  sets?: number;
  reps?: number;
  rest_seconds?: number;
  duration_minutes?: number;
}

export interface WorkoutData {
  id?: string;
  title: string;
  description: string;
  workout_data: { exercises: ExerciseItem[] };
  duration_minutes: number;
  week_number: number;
  day_number: number;
}

interface WorkoutEditorModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  sport: string;
  weekNumber: number;
  dayNumber: number;
  programId: string;
  editWorkout?: WorkoutData | null;
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
const DURATIONS = [30, 45, 60, 90, 120];

// ─── Component ──────────────────────────────────────────────────────────────
export function WorkoutEditorModal({
  open,
  onClose,
  onSaved,
  sport,
  weekNumber,
  dayNumber,
  programId,
  editWorkout,
}: WorkoutEditorModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editWorkout;
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

  useEffect(() => {
    if (editWorkout) {
      setTitle(editWorkout.title);
      setDescription(editWorkout.description || '');
      setDurationMinutes(editWorkout.duration_minutes);
      setExercises(editWorkout.workout_data?.exercises || []);
    } else {
      setTitle('');
      setDescription('');
      setDurationMinutes(60);
      setExercises([]);
    }
    setSearchQuery('');
    setError(null);
  }, [editWorkout, open]);

  if (!open) return null;

  function addExercise(name: string) {
    if (exercises.some((e) => e.name === name)) return;
    const newExercise: ExerciseItem = isCardio
      ? { name, duration_minutes: 10 }
      : { name, sets: 3, reps: 10, rest_seconds: 90 };
    setExercises((prev) => [...prev, newExercise]);
    setSearchQuery('');
  }

  function addCustomExercise() {
    const name = searchQuery.trim();
    if (!name || exercises.some((e) => e.name === name)) return;
    addExercise(name);
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  function updateExercise(index: number, updates: Partial<ExerciseItem>) {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, ...updates } : ex))
    );
  }

  function moveExercise(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= exercises.length) return;
    setExercises((prev) => {
      const arr = [...prev];
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr;
    });
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        workout_data: { exercises },
        duration_minutes: durationMinutes,
        week_number: weekNumber,
        day_number: dayNumber,
      };

      let url: string;
      let method: string;

      if (isEdit && editWorkout?.id) {
        url = `/api/programs/${programId}/workouts`;
        method = 'PATCH';
        payload.workout_id = editWorkout.id;
      } else {
        url = `/api/programs/${programId}/workouts`;
        method = 'POST';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur');
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl z-10 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text">
              {isEdit ? 'Modifier la séance' : 'Nouvelle séance'}
            </h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Semaine {weekNumber} · Jour {dayNumber}
          </p>
        </div>

        {/* Content */}
        <div className="px-5 py-5 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Title */}
          <Input
            label="Titre de la séance"
            placeholder="Ex: Upper Body Strength, Cardio HIIT..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Duration pills */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Durée</label>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDurationMinutes(d)}
                  className={`flex-1 rounded-lg px-3 py-2.5 text-center transition-all ${
                    durationMinutes === d
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-sm font-semibold">{d}</span>
                  <span className="text-[10px] block opacity-75">min</span>
                </button>
              ))}
            </div>
          </div>

          {/* Exercise builder */}
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

          {/* Notes */}
          <Textarea
            label="Notes (optionnel)"
            placeholder="Instructions supplémentaires, consignes d'échauffement..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !title.trim()} className="flex-1">
            {loading
              ? isEdit
                ? 'Mise à jour...'
                : 'Ajout...'
              : isEdit
                ? 'Enregistrer'
                : 'Ajouter la séance'}
          </Button>
        </div>
      </div>
    </div>
  );
}

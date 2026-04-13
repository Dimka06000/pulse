'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ExerciseBuilder, type ExerciseItem } from './exercise-builder';

// ─── Types ──────────────────────────────────────────────────────────────────
export type { ExerciseItem };

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editWorkout;

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
    setError(null);
  }, [editWorkout, open]);

  if (!open) return null;

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
          <ExerciseBuilder
            sport={sport}
            exercises={exercises}
            onChange={setExercises}
          />

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

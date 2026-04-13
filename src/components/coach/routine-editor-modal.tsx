'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExerciseBuilder, type ExerciseItem } from './exercise-builder';

// ─── Types ──────────────────────────────────────────────────────────────────
export type Routine = {
  id: string;
  title: string;
  type: string;
  exercises: { exercises: ExerciseItem[] };
  duration_minutes: number;
};

interface RoutineEditorModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (routine: Routine) => void;
  sport: string;
  editRoutine?: Routine | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const ROUTINE_TYPES = [
  { value: 'warmup', label: 'Echauffement' },
  { value: 'cooldown', label: 'Retour au calme' },
  { value: 'prehab', label: 'Pré-hab' },
  { value: 'mobility', label: 'Mobilité' },
  { value: 'core', label: 'Gainage' },
  { value: 'activation', label: 'Activation' },
];

// ─── Component ──────────────────────────────────────────────────────────────
export function RoutineEditorModal({
  open,
  onClose,
  onSaved,
  sport,
  editRoutine,
}: RoutineEditorModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('warmup');
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [durationOverride, setDurationOverride] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editRoutine;

  // Auto-calculate duration from exercises
  const calculatedDuration = useMemo(() => {
    if (exercises.length === 0) return 10;
    let total = 0;
    for (const ex of exercises) {
      if (ex.duration_minutes) {
        total += ex.duration_minutes;
      } else {
        // Estimate: sets * (reps * 3s + rest) / 60
        const sets = ex.sets || 3;
        const reps = ex.reps || 10;
        const rest = ex.rest_seconds || 60;
        total += (sets * (reps * 3 + rest)) / 60;
      }
    }
    return Math.max(1, Math.round(total));
  }, [exercises]);

  // Sync calculated duration when not overridden
  useEffect(() => {
    if (!durationOverride) {
      setDurationMinutes(calculatedDuration);
    }
  }, [calculatedDuration, durationOverride]);

  // Prefill when editing
  useEffect(() => {
    if (editRoutine) {
      setTitle(editRoutine.title);
      setType(editRoutine.type);
      setExercises((editRoutine.exercises?.exercises || []).map((ex: ExerciseItem) => ({ id: crypto.randomUUID(), ...ex })));
      setDurationMinutes(editRoutine.duration_minutes);
      setDurationOverride(true);
    } else {
      setTitle('');
      setType('warmup');
      setExercises([]);
      setDurationMinutes(10);
      setDurationOverride(false);
    }
    setError(null);
  }, [editRoutine, open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

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
        type,
        exercises: { exercises },
        duration_minutes: durationMinutes,
      };

      if (isEdit && editRoutine?.id) {
        payload.id = editRoutine.id;
      }

      const res = await fetch('/api/routines', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur');
        return;
      }

      const saved = await res.json();
      onSaved(saved);
      onClose();
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Modifier la routine' : 'Nouvelle routine'}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl z-10 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text">
              {isEdit ? 'Modifier la routine' : 'Nouvelle routine'}
            </h2>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
            >
              ✕
            </button>
          </div>
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
            label="Titre de la routine"
            placeholder="Ex: Echauffement articulaire, Retour au calme yoga..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Type selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Type</label>
            <div className="flex flex-wrap gap-2">
              {ROUTINE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    type === t.value
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Exercise builder (reused component) */}
          <ExerciseBuilder
            sport={sport}
            exercises={exercises}
            onChange={setExercises}
          />

          {/* Duration (auto-calculated with manual override) */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Durée estimée
              {!durationOverride && exercises.length > 0 && (
                <span className="text-[10px] text-gray-400 ml-2">(auto-calculée)</span>
              )}
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => {
                  setDurationOverride(true);
                  setDurationMinutes(Number(e.target.value));
                }}
                className="w-24"
              />
              <span className="text-sm text-gray-500">minutes</span>
              {durationOverride && (
                <button
                  type="button"
                  onClick={() => {
                    setDurationOverride(false);
                    setDurationMinutes(calculatedDuration);
                  }}
                  className="text-xs text-brand-500 hover:text-brand-600 transition"
                >
                  Auto
                </button>
              )}
            </div>
          </div>
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
                : 'Création...'
              : isEdit
                ? 'Enregistrer'
                : 'Créer la routine'}
          </Button>
        </div>
      </div>
    </div>
  );
}

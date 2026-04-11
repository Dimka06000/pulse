'use client';

import { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Select } from './select';
import { Textarea } from './textarea';
import { SPORTS, SPORT_LABELS, SPORT_EMOJIS } from '@/lib/sports';

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  duration_minutes?: number;
}

interface CreateSessionModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  defaultDate?: string;
}

const QUICK_EXERCISES: Record<string, string[]> = {
  musculation: ['Squats', 'Développé couché', 'Tractions', 'Soulevé de terre', 'Rowing', 'Curl biceps', 'Dips', 'Fentes'],
  crossfit: ['Burpees', 'Box jumps', 'Thrusters', 'Wall balls', 'Double-unders', 'Toes to bar', 'Clean & jerk'],
  yoga: ['Salutation au soleil', 'Guerrier I', 'Guerrier II', 'Chien tête en bas', 'Planche', 'Pont'],
  running: ['Course continue', 'Fractionné', 'Côtes', 'Tempo run', 'Récupération'],
  cyclisme: ['Sortie endurance', 'Intervalles', 'Côtes', 'Tempo', 'Récupération'],
  natation: ['Crawl continu', 'Séries 100m', 'Dos', 'Brasse', 'Éducatifs'],
  boxe: ['Shadow boxing', 'Sac lourd', 'Corde à sauter', 'Pattes d\'ours', 'Sparring'],
  fitness: ['Gainage', 'Pompes', 'Abdos', 'Mountain climbers', 'Jumping jacks'],
};

function CreateSessionModal({ open, onClose, onCreated, defaultDate }: CreateSessionModalProps) {
  const [sport, setSport] = useState('');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('60');
  const [scheduledAt, setScheduledAt] = useState(defaultDate || '');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showExercises, setShowExercises] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const sportOptions = SPORTS.map((s) => ({
    value: s,
    label: `${SPORT_EMOJIS[s]} ${SPORT_LABELS[s]}`,
  }));

  const quickList = sport ? (QUICK_EXERCISES[sport] || QUICK_EXERCISES.fitness) : [];

  const addExercise = (name: string) => {
    setExercises(prev => [...prev, { name, sets: 3, reps: 10, rest_seconds: 60 }]);
    if (!showExercises) setShowExercises(true);
  };

  const updateExercise = (idx: number, field: keyof Exercise, value: string | number) => {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const removeExercise = (idx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!sport || !duration || !scheduledAt) {
      setError('Veuillez remplir tous les champs requis');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/solo-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport,
          title: title || `${SPORT_LABELS[sport as keyof typeof SPORT_LABELS]} solo`,
          duration_minutes: parseInt(duration, 10),
          scheduled_at: new Date(scheduledAt).toISOString(),
          notes,
          metrics: exercises.length > 0 ? { exercises } : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }

      await fetch('/api/streaks', { method: 'POST' }).catch(() => {});

      setSport('');
      setTitle('');
      setDuration('60');
      setScheduledAt(defaultDate || '');
      setNotes('');
      setExercises([]);
      setShowExercises(false);
      onCreated?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text">Nouvelle séance</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted hover:bg-gray-200 transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Sport"
            required
            options={sportOptions}
            placeholder="Choisir un sport"
            value={sport}
            onChange={(e) => { setSport(e.target.value); setExercises([]); }}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Durée (min)"
              required
              type="number"
              min={5}
              max={480}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <Input
              label="Date et heure"
              required
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          <Input
            label="Titre (optionnel)"
            placeholder="Ex: Upper body, sortie longue..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Quick add exercises */}
          {sport && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-text">Exercices</label>
                <span className="text-xs text-muted">{exercises.length} ajouté{exercises.length > 1 ? 's' : ''}</span>
              </div>

              {/* Quick chips */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {quickList.map(name => {
                  const added = exercises.some(e => e.name === name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => !added && addExercise(name)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        added
                          ? 'bg-brand-500/10 text-brand-600'
                          : 'bg-surface text-muted hover:bg-surface/80'
                      }`}
                    >
                      {added ? '✓ ' : '+ '}{name}
                    </button>
                  );
                })}
              </div>

              {/* Exercise list with details */}
              {exercises.length > 0 && (
                <div className="space-y-2">
                  {exercises.map((ex, i) => (
                    <div key={i} className="rounded-xl bg-surface p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-text">{ex.name}</span>
                        <button
                          type="button"
                          onClick={() => removeExercise(i)}
                          className="text-xs text-muted hover:text-danger"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-muted">Séries</label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={ex.sets}
                            onChange={(e) => updateExercise(i, 'sets', +e.target.value)}
                            className="w-full rounded-lg border border-border px-2 py-1.5 text-sm text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted">Reps</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={ex.reps}
                            onChange={(e) => updateExercise(i, 'reps', +e.target.value)}
                            className="w-full rounded-lg border border-border px-2 py-1.5 text-sm text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted">Repos (s)</label>
                          <input
                            type="number"
                            min={0}
                            max={600}
                            step={15}
                            value={ex.rest_seconds}
                            onChange={(e) => updateExercise(i, 'rest_seconds', +e.target.value)}
                            className="w-full rounded-lg border border-border px-2 py-1.5 text-sm text-center"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Textarea
            label="Notes (optionnel)"
            placeholder="Objectif, sensations..."
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={loading} className="flex-1">
              Créer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { CreateSessionModal };

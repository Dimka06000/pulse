'use client';

import { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Select } from './select';
import { Textarea } from './textarea';
import { SPORTS, SPORT_LABELS, SPORT_EMOJIS } from '@/lib/sports';

interface CreateSessionModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

function CreateSessionModal({ open, onClose, onCreated }: CreateSessionModalProps) {
  const [sport, setSport] = useState('');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('60');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const sportOptions = SPORTS.map((s) => ({
    value: s,
    label: `${SPORT_EMOJIS[s]} ${SPORT_LABELS[s]}`,
  }));

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
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }

      // Update streak
      await fetch('/api/streaks', { method: 'POST' }).catch(() => {});

      setSport('');
      setTitle('');
      setDuration('60');
      setScheduledAt('');
      setNotes('');
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text">Nouvelle séance solo</h2>
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
            onChange={(e) => setSport(e.target.value)}
          />

          <Input
            label="Titre (optionnel)"
            placeholder="Ex: Course matinale"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Input
            label="Durée (minutes)"
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

          <Textarea
            label="Notes (optionnel)"
            placeholder="Objectif de la séance, sensations..."
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={loading} className="flex-1">
              Créer la séance
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { CreateSessionModal };

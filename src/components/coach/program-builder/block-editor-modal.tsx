'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ProgramBlock } from './timeline-bar';

// ─── Constants ──────────────────────────────────────────────────────────────
const PHASES = [
  { value: 'base', label: 'Base', color: 'bg-blue-500' },
  { value: 'build', label: 'Construction', color: 'bg-amber-500' },
  { value: 'peak', label: 'Pic', color: 'bg-red-500' },
  { value: 'taper', label: 'Affûtage', color: 'bg-emerald-500' },
  { value: 'race', label: 'Course', color: 'bg-yellow-500' },
  { value: 'recovery', label: 'Récupération', color: 'bg-violet-500' },
];

const FOCUSES = [
  { value: 'hypertrophy', label: 'Hypertrophie' },
  { value: 'strength', label: 'Force' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'power', label: 'Puissance' },
  { value: 'recovery', label: 'Récupération' },
  { value: 'general', label: 'Général' },
];

function generateProgressionCurve(weeks: number): number[] {
  return Array.from({ length: weeks }, (_, i) =>
    (i + 1) % 4 === 0 ? 60 : [70, 80, 90][i % 4] ?? 70
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface BlockEditorModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (block: ProgramBlock) => void;
  programId: string;
  editBlock?: ProgramBlock | null;
}

// ─── Component ──────────────────────────────────────────────────────────────
export function BlockEditorModal({
  open,
  onClose,
  onSaved,
  programId,
  editBlock,
}: BlockEditorModalProps) {
  const [title, setTitle] = useState('');
  const [phase, setPhase] = useState('base');
  const [focus, setFocus] = useState('general');
  const [weekStart, setWeekStart] = useState(1);
  const [weekEnd, setWeekEnd] = useState(4);
  const [progressionCurve, setProgressionCurve] = useState<number[]>([70, 80, 90, 60]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editBlock;

  // Prefill when editing
  useEffect(() => {
    if (editBlock) {
      setTitle(editBlock.title);
      setPhase(editBlock.phase);
      setFocus(editBlock.focus);
      setWeekStart(editBlock.week_start);
      setWeekEnd(editBlock.week_end);
      setProgressionCurve(editBlock.progression_curve);
    } else {
      setTitle('');
      setPhase('base');
      setFocus('general');
      setWeekStart(1);
      setWeekEnd(4);
      setProgressionCurve([70, 80, 90, 60]);
    }
    setError(null);
  }, [editBlock, open]);

  // Regenerate curve when week range changes (only for new blocks)
  useEffect(() => {
    if (isEdit) return;
    const weeks = Math.max(1, weekEnd - weekStart + 1);
    setProgressionCurve(generateProgressionCurve(weeks));
  }, [weekStart, weekEnd, isEdit]);

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

  function updateCurveValue(index: number, value: number) {
    setProgressionCurve((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }
    if (weekEnd < weekStart) {
      setError('La semaine de fin doit être >= semaine de début');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        phase,
        focus,
        week_start: weekStart,
        week_end: weekEnd,
        progression_curve: progressionCurve,
      };

      if (isEdit && editBlock?.id) {
        payload.block_id = editBlock.id;
      }

      const res = await fetch(`/api/programs/${programId}/blocks`, {
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

  const weekCount = Math.max(1, weekEnd - weekStart + 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Modifier le bloc' : 'Nouveau bloc'}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl z-10 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text">
              {isEdit ? 'Modifier le bloc' : 'Nouveau bloc'}
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
            label="Titre du bloc"
            placeholder="Ex: Préparation générale, Pic de force..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Phase selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Phase</label>
            <div className="flex flex-wrap gap-2">
              {PHASES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPhase(p.value)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    phase === p.value
                      ? `${p.color} text-white shadow-sm`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Focus selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Focus</label>
            <div className="flex flex-wrap gap-2">
              {FOCUSES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFocus(f.value)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    focus === f.value
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Week range */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Période</label>
            <div className="flex items-center gap-3">
              <Input
                label="Semaine début"
                type="number"
                min={1}
                value={weekStart}
                onChange={(e) => setWeekStart(Number(e.target.value))}
                className="w-28"
              />
              <Input
                label="Semaine fin"
                type="number"
                min={weekStart}
                value={weekEnd}
                onChange={(e) => setWeekEnd(Number(e.target.value))}
                className="w-28"
              />
            </div>
          </div>

          {/* Progression curve */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Courbe de progression
              <span className="text-[10px] text-gray-400 ml-2">(intensité % par semaine)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: weekCount }, (_, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-400">S{weekStart + i}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={progressionCurve[i] ?? 70}
                    onChange={(e) => updateCurveValue(i, Number(e.target.value))}
                    className="w-14 rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-center
                      focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              ))}
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
                : 'Créer le bloc'}
          </Button>
        </div>
      </div>
    </div>
  );
}

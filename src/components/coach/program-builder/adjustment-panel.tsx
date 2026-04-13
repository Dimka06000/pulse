'use client';

import { useState } from 'react';
import { useToast } from '@/components/pulse/toast';
import type { Adjustment } from '@/lib/training/program-adjuster';

interface AdjustmentPanelProps {
  programId: string;
  onAdjustmentsApplied: () => void;
}

const TYPE_META: Record<Adjustment['type'], { icon: string; label: string; color: string }> = {
  modify: { icon: '✏️', label: 'Modifier', color: 'border-blue-300 bg-blue-50' },
  add: { icon: '➕', label: 'Ajouter', color: 'border-green-300 bg-green-50' },
  remove: { icon: '❌', label: 'Supprimer', color: 'border-red-300 bg-red-50' },
  alert: { icon: '⚠️', label: 'Alerte', color: 'border-amber-300 bg-amber-50' },
};

export function AdjustmentPanel({ programId, onAdjustmentsApplied }: AdjustmentPanelProps) {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [accepted, setAccepted] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const { addToast } = useToast();

  async function handleAnalyze() {
    setLoading(true);
    setAnalyzed(false);
    setAdjustments([]);
    setAccepted({});

    try {
      const res = await fetch(`/api/programs/${programId}/adjust`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de l\'analyse');
      }
      const data = await res.json();
      const adjs: Adjustment[] = data.adjustments ?? [];
      setAdjustments(adjs);
      // Accept all by default
      const defaultAccepted: Record<number, boolean> = {};
      adjs.forEach((_, i) => { defaultAccepted[i] = true; });
      setAccepted(defaultAccepted);
      setAnalyzed(true);
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Erreur d\'analyse' });
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    const toApply = adjustments.filter((_, i) => accepted[i]);
    if (toApply.length === 0) {
      addToast({ type: 'error', message: 'Aucun ajustement sélectionné' });
      return;
    }

    setApplying(true);
    try {
      const res = await fetch(`/api/programs/${programId}/adjust`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustments: toApply }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de l\'application');
      }
      const data = await res.json();
      addToast({
        type: 'success',
        message: `${data.applied} ajustement${data.applied > 1 ? 's' : ''} appliqué${data.applied > 1 ? 's' : ''}`,
      });
      setAdjustments([]);
      setAccepted({});
      setAnalyzed(false);
      onAdjustmentsApplied();
    } catch (err) {
      addToast({ type: 'error', message: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setApplying(false);
    }
  }

  function toggleAccepted(index: number) {
    setAccepted((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  const acceptedCount = Object.values(accepted).filter(Boolean).length;

  return (
    <div className="mt-6 rounded-xl border border-border bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-text flex items-center gap-2">
            <span className="text-lg">🤖</span>
            Ajustements IA
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Compare le programme prévu aux séances réalisées
          </p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="rounded-lg bg-gradient-to-r from-brand-500 to-cyan-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Analyse en cours...' : 'Analyser le programme'}
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-3 py-8 justify-center text-muted">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
          <span className="text-sm">Analyse en cours...</span>
        </div>
      )}

      {analyzed && adjustments.length === 0 && !loading && (
        <div className="py-6 text-center text-sm text-muted">
          Aucun ajustement suggéré — le programme est en ligne avec les séances réalisées.
        </div>
      )}

      {adjustments.length > 0 && (
        <>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {adjustments.map((adj, i) => {
              const meta = TYPE_META[adj.type];
              const isAccepted = accepted[i] ?? false;

              return (
                <div
                  key={i}
                  className={`rounded-lg border p-3 transition ${
                    isAccepted ? meta.color : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-lg shrink-0">{meta.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium text-text">
                          <span className="px-1.5 py-0.5 rounded text-xs bg-white/80 border border-current/10">
                            S{adj.weekNumber} J{adj.dayNumber}
                          </span>
                          <span>{meta.label}</span>
                        </div>
                        <p className="text-sm text-muted mt-1">{adj.reason}</p>
                        {adj.changes && (
                          <div className="flex gap-3 mt-2 text-xs text-muted">
                            {adj.changes.title && (
                              <span>Titre: {adj.changes.title}</span>
                            )}
                            {adj.changes.durationMinutes && (
                              <span>{adj.changes.durationMinutes} min</span>
                            )}
                            {adj.changes.intensityPercent && (
                              <span>Intensité {adj.changes.intensityPercent}%</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleAccepted(i)}
                      className={`shrink-0 rounded-full h-7 w-7 flex items-center justify-center text-sm border transition ${
                        isAccepted
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-white text-muted border-gray-300 hover:border-brand-400'
                      }`}
                      title={isAccepted ? 'Rejeter' : 'Accepter'}
                    >
                      {isAccepted ? '✓' : ''}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <span className="text-xs text-muted">
              {acceptedCount}/{adjustments.length} sélectionné{acceptedCount > 1 ? 's' : ''}
            </span>
            <button
              onClick={handleApply}
              disabled={applying || acceptedCount === 0}
              className="rounded-lg bg-text px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
            >
              {applying ? 'Application...' : `Appliquer ${acceptedCount} ajustement${acceptedCount > 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

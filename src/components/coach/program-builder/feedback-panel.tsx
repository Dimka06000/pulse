'use client';

import { useState } from 'react';
import type { Recommendation } from '@/lib/training/types';

interface Adjustment {
  weekNumber: number;
  dayNumber: number;
  type: 'increase_intensity' | 'decrease_intensity' | 'add_recovery' | 'redistribute' | 'skip';
  description: string;
  intensityChange?: number;
}

interface FeedbackResult {
  summary: string;
  adherence: number;
  adjustments: Adjustment[];
  recommendations: Recommendation[];
}

interface FeedbackPanelProps {
  programId: string;
  activeWeek: number;
  athleteId?: string;
}

const ADJUSTMENT_LABELS: Record<Adjustment['type'], string> = {
  increase_intensity: 'Augmenter',
  decrease_intensity: 'Diminuer',
  add_recovery: 'Récupération',
  redistribute: 'Redistribuer',
  skip: 'Passer',
};

const ADJUSTMENT_COLORS: Record<Adjustment['type'], string> = {
  increase_intensity: 'bg-green-100 text-green-800 border-green-200',
  decrease_intensity: 'bg-orange-100 text-orange-800 border-orange-200',
  add_recovery: 'bg-blue-100 text-blue-800 border-blue-200',
  redistribute: 'bg-purple-100 text-purple-800 border-purple-200',
  skip: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function FeedbackPanel({ programId, activeWeek, athleteId }: FeedbackPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FeedbackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appliedAdjustments, setAppliedAdjustments] = useState<Set<number>>(new Set());

  if (!athleteId) {
    return (
      <div className="mt-6 rounded-xl border border-border bg-white p-5">
        <h3 className="text-sm font-semibold text-text mb-2">Analyse IA</h3>
        <p className="text-sm text-muted">
          Assignez un athlete pour activer l&apos;analyse prevu vs realise.
        </p>
      </div>
    );
  }

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setResult(null);
    setAppliedAdjustments(new Set());

    try {
      const res = await fetch(`/api/programs/${programId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekNumber: activeWeek }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur lors de l\'analyse');
      }

      const data: FeedbackResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyAdjustment(adj: Adjustment, index: number) {
    if (!adj.intensityChange) return;

    try {
      // We PATCH the workout for the given week/day
      const res = await fetch(`/api/programs/${programId}/workouts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_number: adj.weekNumber,
          day_number: adj.dayNumber,
          intensity_change: adj.intensityChange,
        }),
      });

      if (res.ok) {
        setAppliedAdjustments((prev) => new Set(prev).add(index));
      }
    } catch {
      // Silent fail — button stays available for retry
    }
  }

  function getAdherenceColor(adherence: number): string {
    if (adherence >= 80) return 'bg-green-500';
    if (adherence >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  }

  function getAdherenceLabel(adherence: number): string {
    if (adherence >= 80) return 'Excellent';
    if (adherence >= 50) return 'Moyen';
    return 'Faible';
  }

  const priorityColors: Record<string, string> = {
    high: 'border-l-red-500',
    medium: 'border-l-orange-400',
    low: 'border-l-blue-400',
  };

  return (
    <div className="mt-6 rounded-xl border border-border bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text">
          Analyse de la semaine {activeWeek}
        </h3>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="rounded-lg bg-gradient-to-r from-brand-500 to-cyan-500 px-4 py-1.5 text-xs font-medium text-white hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Analyse en cours...' : 'Analyser'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Adherence bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted">Adherence</span>
              <span className="text-xs font-medium text-text">
                {result.adherence}% — {getAdherenceLabel(result.adherence)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getAdherenceColor(result.adherence)}`}
                style={{ width: `${result.adherence}%` }}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-surface p-3">
            <p className="text-sm text-text leading-relaxed">{result.summary}</p>
          </div>

          {/* Adjustments */}
          {result.adjustments.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Ajustements proposes
              </h4>
              <div className="space-y-2">
                {result.adjustments.map((adj, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 ${ADJUSTMENT_COLORS[adj.type]}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold uppercase">
                            {ADJUSTMENT_LABELS[adj.type]}
                          </span>
                          <span className="text-xs opacity-70">
                            S{adj.weekNumber} J{adj.dayNumber}
                          </span>
                          {adj.intensityChange != null && (
                            <span className="text-xs font-mono">
                              {adj.intensityChange > 0 ? '+' : ''}{adj.intensityChange}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed">{adj.description}</p>
                      </div>
                      {adj.intensityChange != null && (
                        <button
                          onClick={() => handleApplyAdjustment(adj, i)}
                          disabled={appliedAdjustments.has(i)}
                          className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium transition ${
                            appliedAdjustments.has(i)
                              ? 'bg-green-600 text-white cursor-default'
                              : 'bg-white/80 hover:bg-white text-text'
                          }`}
                        >
                          {appliedAdjustments.has(i) ? 'Applique' : 'Appliquer'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Recommandations
              </h4>
              <div className="space-y-2">
                {result.recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className={`rounded-lg border border-border bg-white p-3 border-l-4 ${priorityColors[rec.priority] || ''}`}
                  >
                    <p className="text-sm text-text">{rec.message}</p>
                    <span className="text-xs text-muted capitalize">{rec.category}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

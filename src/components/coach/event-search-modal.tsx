'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface ScrapedEventData {
  name: string;
  date: string | null;
  sport: string;
  location: string;
  distanceKm: number | null;
  elevationM: number | null;
  terrainType: string | null;
  description: string;
  conditions: string;
  experienceReports: string[];
  sourceUrls: string[];
}

interface EventSearchModalProps {
  open: boolean;
  onClose: () => void;
  onEventSelected: (event: ScrapedEventData) => void;
  programId: string;
}

// ─── Component ──────────────────────────────────────────────────────────────
export function EventSearchModal({
  open,
  onClose,
  onEventSelected,
  programId,
}: EventSearchModalProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScrapedEventData | null>(null);
  const [conditionsExpanded, setConditionsExpanded] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setLoading(false);
      setError(null);
      setResult(null);
      setConditionsExpanded(false);
    }
  }, [open]);

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

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/programs/${programId}/scrape-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) {
        setError('Impossible de trouver cet événement. Essayez avec plus de détails.');
        return;
      }

      const data: ScrapedEventData = await res.json();
      setResult(data);
    } catch {
      setError('Impossible de trouver cet événement. Essayez avec plus de détails.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Rechercher un événement"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl z-10 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text">Rechercher un événement</h2>
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
          {/* Search input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Marathon de Paris 2027, Spartan Race Lyon..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading || !query.trim()}>
              Rechercher
            </Button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              <p className="text-sm text-gray-500">
                Recherche en cours... Analyse des données de l&apos;événement
              </p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Results card */}
          {result && (
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 space-y-4">
                {/* Event name & meta */}
                <div>
                  <h3 className="text-lg font-bold text-text">{result.name}</h3>
                  <p className="text-sm text-gray-500">
                    {[result.date, result.location].filter(Boolean).join(' · ')}
                  </p>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-2">
                  {result.distanceKm != null && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                      {result.distanceKm} km
                    </span>
                  )}
                  {result.elevationM != null && (
                    <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
                      D+ {result.elevationM} m
                    </span>
                  )}
                  {result.terrainType && (
                    <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                      {result.terrainType}
                    </span>
                  )}
                </div>

                {/* Description */}
                {result.description && (
                  <p className="text-sm text-gray-600 leading-relaxed">{result.description}</p>
                )}

                {/* Conditions (expandable) */}
                {result.conditions && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setConditionsExpanded(!conditionsExpanded)}
                      className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition"
                    >
                      <span className={`transition-transform ${conditionsExpanded ? 'rotate-90' : ''}`}>
                        ▶
                      </span>
                      Conditions
                    </button>
                    {conditionsExpanded && (
                      <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                        {result.conditions}
                      </p>
                    )}
                  </div>
                )}

                {/* Experience reports */}
                {result.experienceReports.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Retours d&apos;expérience</p>
                    <div className="space-y-2">
                      {result.experienceReports.map((report, i) => (
                        <div
                          key={i}
                          className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed"
                        >
                          {report}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source URLs */}
                {result.sourceUrls.length > 0 && (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex flex-wrap gap-2">
                      {result.sourceUrls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-brand-500 hover:text-brand-600 underline truncate max-w-[200px]"
                        >
                          {new URL(url).hostname}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {result && (
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button onClick={() => onEventSelected(result)} className="flex-1">
              Utiliser cet événement
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

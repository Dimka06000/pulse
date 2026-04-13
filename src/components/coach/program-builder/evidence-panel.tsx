'use client';

import { useState, useCallback } from 'react';

interface PubMedResult {
  title: string;
  authors: string;
  journal: string;
  year: string;
  abstract: string;
  pmid: string;
  url: string;
}

interface EvidencePanelProps {
  programId: string;
  sport: string;
  eventName?: string;
}

type FetchState = 'idle' | 'loading' | 'done' | 'error';

export function EvidencePanel({ sport, eventName }: EvidencePanelProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PubMedResult[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>('idle');

  const fetchEvidence = useCallback(async () => {
    if (fetchState === 'done' || fetchState === 'loading') return;
    setFetchState('loading');
    try {
      const goal = eventName ?? 'general fitness';
      const res = await fetch(
        `/api/training/evidence?sport=${encodeURIComponent(sport)}&goal=${encodeURIComponent(goal)}`,
      );
      if (!res.ok) throw new Error('fetch failed');
      const data: PubMedResult[] = await res.json();
      setResults(data);
      setFetchState('done');
    } catch {
      setFetchState('error');
    }
  }, [sport, eventName, fetchState]);

  const handleToggle = () => {
    if (!open && fetchState === 'idle') {
      void fetchEvidence();
    }
    setOpen((prev) => !prev);
  };

  return (
    <div className="mt-4 rounded-xl border border-border bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-text hover:bg-surface transition-colors"
      >
        {/* Flask icon */}
        <svg className="h-4 w-4 text-brand-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3h6M9 3v6l-4 10a1 1 0 0 0 .894 1.447h12.212A1 1 0 0 0 19 19L15 9V3"/>
        </svg>
        <span className="flex-1 text-left">Sources scientifiques</span>
        {fetchState === 'loading' && (
          <span className="text-xs text-muted animate-pulse">Recherche en cours...</span>
        )}
        {/* Chevron */}
        {open ? (
          <svg className="h-4 w-4 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        ) : (
          <svg className="h-4 w-4 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        )}
      </button>

      {/* Expandable body */}
      {open && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {fetchState === 'loading' && (
            <div className="py-4 text-center text-sm text-muted animate-pulse">
              Recherche PubMed...
            </div>
          )}

          {fetchState === 'error' && (
            <p className="text-sm text-red-500">
              Impossible de récupérer les sources. Vérifiez votre connexion.
            </p>
          )}

          {fetchState === 'done' && results.length === 0 && (
            <p className="text-sm text-muted italic">
              Aucune source — Générez un programme pour obtenir des références.
            </p>
          )}

          {fetchState === 'done' &&
            results.map((r) => (
              <div
                key={r.pmid}
                className="rounded-lg border border-border bg-surface p-3 space-y-1"
              >
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-brand-600 hover:underline flex items-start gap-1 leading-snug"
                >
                  <span className="flex-1">{r.title}</span>
                  {/* External link icon */}
                  <svg className="h-3 w-3 mt-0.5 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/>
                  </svg>
                </a>
                <p className="text-xs text-muted">
                  {[r.authors, r.journal, r.year].filter(Boolean).join(' · ')}
                </p>
                {r.abstract && (
                  <p className="text-xs text-text/70 line-clamp-3">{r.abstract}</p>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

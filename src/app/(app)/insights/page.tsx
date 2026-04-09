'use client';

import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/pulse/app-header';
import { InjuryAlert } from '@/components/pulse/injury-alert';
import { WorkoutSuggestionCard } from '@/components/pulse/workout-suggestion';
import { WeeklyDigestCard } from '@/components/pulse/weekly-digest';
import { CorrelationCard } from '@/components/pulse/correlation-card';
import type { Correlation } from '@/lib/intelligence/engine';

export default function InsightsPage() {
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [corrLoading, setCorrLoading] = useState(true);
  const [notEnoughData, setNotEnoughData] = useState(false);
  const [currentEntries, setCurrentEntries] = useState(0);

  useEffect(() => {
    fetch('/api/intelligence/correlations')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setCorrelations(data.correlations || []);
          if (data.minEntries && data.currentEntries < data.minEntries) {
            setNotEnoughData(true);
            setCurrentEntries(data.currentEntries);
          }
        }
      })
      .catch(() => {})
      .finally(() => setCorrLoading(false));
  }, []);

  return (
    <>
      <AppHeader greeting="Intelligence" title="Vos insights" />
      <div className="p-4 md:p-8 space-y-6">
        {/* 1. Injury Alert */}
        <InjuryAlert />

        {/* 2. Today's Suggestion */}
        <div>
          <h2 className="mb-3 text-sm font-bold text-text">Suggestion du jour</h2>
          <WorkoutSuggestionCard />
        </div>

        {/* 3. Weekly Digest */}
        <div>
          <h2 className="mb-3 text-sm font-bold text-text">Bilan de la semaine</h2>
          <WeeklyDigestCard />
        </div>

        {/* 4. Correlations */}
        <div>
          <h2 className="mb-3 text-sm font-bold text-text">Corrélations</h2>
          {corrLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2].map(i => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-surface" />
              ))}
            </div>
          ) : notEnoughData ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-8 text-center">
              <p className="text-3xl mb-3">📓</p>
              <p className="text-sm font-semibold text-text">Pas encore assez de données</p>
              <p className="mt-1 text-xs text-muted">
                Remplissez votre journal pendant 7 jours pour débloquer les insights.
                ({currentEntries}/7 entrées)
              </p>
              <div className="mt-3 h-1.5 w-32 mx-auto rounded-full bg-surface overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-500"
                  style={{ width: `${(currentEntries / 7) * 100}%` }}
                />
              </div>
            </div>
          ) : correlations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-8 text-center">
              <p className="text-3xl mb-3">🔬</p>
              <p className="text-sm font-semibold text-text">Aucune corrélation significative</p>
              <p className="mt-1 text-xs text-muted">
                Continuez à remplir votre journal. Les patterns apparaîtront avec plus de données.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {correlations.map((c, i) => (
                <CorrelationCard key={i} correlation={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

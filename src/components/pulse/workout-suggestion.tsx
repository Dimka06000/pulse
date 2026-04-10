'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { WorkoutSuggestion } from '@/lib/intelligence/engine';
import { SPORT_EMOJIS, SPORT_LABELS, type Sport } from '@/lib/sports';

const typeGradients: Record<WorkoutSuggestion['type'], string> = {
  rest: 'from-blue-400 to-indigo-500',
  light: 'from-emerald-400 to-teal-500',
  moderate: 'from-amber-400 to-orange-500',
  intense: 'from-red-400 to-rose-600',
};

const typeLabels: Record<WorkoutSuggestion['type'], string> = {
  rest: 'Repos actif',
  light: 'Léger',
  moderate: 'Modéré',
  intense: 'Intense',
};

export function WorkoutSuggestionCard({ compact }: { compact?: boolean }) {
  const [suggestion, setSuggestion] = useState<WorkoutSuggestion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/intelligence/suggest')
      .then(r => r.ok ? r.json() : null)
      .then(setSuggestion)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className={`${compact ? 'h-24' : 'h-40'} animate-pulse rounded-2xl bg-surface`} />;
  }

  if (!suggestion) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border bg-gradient-to-b from-surface to-white px-5 py-8 text-center">
        <p className="text-3xl mb-3">💡</p>
        <p className="text-sm font-semibold text-text">Pas de suggestion pour le moment</p>
        <p className="mt-1 text-xs text-muted">Connectez Strava pour des insights personnalisés</p>
      </div>
    );
  }

  const gradient = typeGradients[suggestion.type];
  const emoji = SPORT_EMOJIS[suggestion.sport as Sport] || '⚡';
  const sportName = SPORT_LABELS[suggestion.sport as Sport] || suggestion.sport;

  if (compact) {
    return (
      <Link href="/insights" className="block">
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-4 text-white`}>
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10" />
          <div className="flex items-center gap-3">
            <span className="text-2xl">{emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold opacity-80">Suggestion du jour</p>
              <p className="text-sm font-bold truncate">{suggestion.title}</p>
            </div>
            <span className="rounded-lg bg-white/20 px-2 py-1 text-xs font-semibold">
              {suggestion.durationMinutes} min
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white`}>
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-8 h-20 w-20 rounded-full bg-white/5" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="rounded-lg bg-white/20 px-2 py-0.5 text-xs font-semibold">
            {typeLabels[suggestion.type]}
          </span>
          <span className="text-xs opacity-70">{suggestion.durationMinutes} min</span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{emoji}</span>
          <div>
            <p className="text-lg font-bold">{suggestion.title}</p>
            <p className="text-xs opacity-80">{sportName}</p>
          </div>
        </div>

        <p className="text-sm opacity-90 mb-4">{suggestion.reason}</p>

        <Link
          href={`/planning?sport=${suggestion.sport}&duration=${suggestion.durationMinutes}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur-sm hover:bg-white/30 transition-colors"
        >
          Commencer →
        </Link>
      </div>
    </div>
  );
}

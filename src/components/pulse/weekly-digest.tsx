'use client';

import { useState, useEffect } from 'react';
import type { WeeklyDigest } from '@/lib/intelligence/engine';
import { SPORT_EMOJIS, SPORT_LABELS, type Sport } from '@/lib/sports';

export function WeeklyDigestCard() {
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/intelligence/digest')
      .then(r => r.ok ? r.json() : null)
      .then(setDigest)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-surface" />;
  }

  if (!digest) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className="bg-gradient-to-r from-brand-500 to-cyan-500 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Bilan hebdomadaire</p>
          <p className="mt-0.5 text-lg font-bold text-white">Cette semaine</p>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-extrabold text-text/20">0</p>
              <p className="text-[11px] text-muted">Séances</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-text/20">0</p>
              <p className="text-[11px] text-muted">Minutes</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-text/20">0</p>
              <p className="text-[11px] text-muted">Jours de suite</p>
            </div>
          </div>
          <div className="rounded-xl bg-gradient-to-r from-brand-500/5 to-cyan-500/5 border border-brand-500/15 px-4 py-3">
            <p className="text-xs font-semibold text-brand-500 mb-1">💡 Conseil</p>
            <p className="text-sm text-text">Enregistrez votre première séance pour générer votre bilan hebdomadaire.</p>
          </div>
        </div>
      </div>
    );
  }

  const sessionsTrend = digest.vsLastWeek.sessions;
  const minutesTrend = digest.vsLastWeek.minutes;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-500 to-cyan-500 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Bilan hebdomadaire</p>
        <p className="mt-0.5 text-lg font-bold text-white">{digest.period}</p>
      </div>

      <div className="p-5 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-extrabold text-text">{digest.totalSessions}</p>
            <p className="text-[11px] text-muted">Séances</p>
            {sessionsTrend !== 0 && (
              <span className={`text-[10px] font-semibold ${sessionsTrend > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                {sessionsTrend > 0 ? '↑' : '↓'} {Math.abs(sessionsTrend)}
              </span>
            )}
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text">{digest.totalMinutes}</p>
            <p className="text-[11px] text-muted">Minutes</p>
            {minutesTrend !== 0 && (
              <span className={`text-[10px] font-semibold ${minutesTrend > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                {minutesTrend > 0 ? '↑' : '↓'} {Math.abs(minutesTrend)} min
              </span>
            )}
          </div>
          <div>
            <p className="text-2xl font-extrabold text-text">{digest.streak}</p>
            <p className="text-[11px] text-muted">Jours de suite</p>
          </div>
        </div>

        {/* Top sport */}
        {digest.topSport && (
          <div className="flex items-center gap-2 rounded-xl bg-surface px-4 py-2.5">
            <span className="text-lg">{SPORT_EMOJIS[digest.topSport.sport as Sport] || '⚡'}</span>
            <span className="text-sm font-semibold text-text">
              {SPORT_LABELS[digest.topSport.sport as Sport] || digest.topSport.sport}
            </span>
            <span className="ml-auto text-xs text-muted">{digest.topSport.count}x cette semaine</span>
          </div>
        )}

        {/* Records */}
        {digest.newRecords.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Nouveaux records</p>
            {digest.newRecords.map((r, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
                <span className="text-base">🔥</span>
                <span className="text-sm font-medium text-text">
                  {SPORT_LABELS[r.sport as Sport] || r.sport} — {r.metric}
                </span>
                <span className="ml-auto text-sm font-bold text-amber-600">
                  {r.value} {r.unit}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Insights */}
        {digest.insights.length > 0 && (
          <div className="space-y-1.5">
            {digest.insights.map((insight, i) => (
              <p key={i} className="text-sm text-text/80">{insight}</p>
            ))}
          </div>
        )}

        {/* Suggestion */}
        <div className="rounded-xl bg-gradient-to-r from-brand-500/5 to-cyan-500/5 border border-brand-500/15 px-4 py-3">
          <p className="text-xs font-semibold text-brand-500 mb-1">💡 Suggestion</p>
          <p className="text-sm text-text">{digest.suggestion}</p>
        </div>
      </div>
    </div>
  );
}

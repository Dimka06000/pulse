'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/pulse/app-header';
import { EmptyState } from '@/components/pulse/empty-state';
import { JournalEntryForm } from '@/components/pulse/journal-entry';
import { useAuthStore } from '@/stores/auth';

/* eslint-disable @typescript-eslint/no-explicit-any */

const FACE_EMOJIS = ['😫', '😟', '😐', '🙂', '😁'];

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function MiniCard({ entry }: { entry: any }) {
  const d = new Date(entry.date);
  const dayLabel = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-white p-2.5 text-center min-w-[72px]">
      <p className="text-[10px] font-semibold text-muted capitalize">{dayLabel}</p>
      <p className="text-lg">{entry.mood ? FACE_EMOJIS[entry.mood - 1] : '—'}</p>
      <div className="flex gap-0.5 text-[9px] text-muted">
        {entry.sleep_hours != null && <span>🛌{entry.sleep_hours}h</span>}
      </div>
      <div className="flex gap-0.5">
        {entry.energy_level && (
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{
            backgroundColor: entry.energy_level >= 4 ? '#10b981' : entry.energy_level >= 3 ? '#f59e0b' : '#ef4444'
          }} />
        )}
        {entry.stress_level && (
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{
            backgroundColor: entry.stress_level <= 2 ? '#10b981' : entry.stress_level <= 3 ? '#f59e0b' : '#ef4444'
          }} />
        )}
      </div>
    </div>
  );
}

// Timeline entry card for past entries
function TimelineEntry({ entry }: { entry: any }) {
  const d = new Date(entry.date);
  const dayLabel = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const moodEmoji = entry.mood ? FACE_EMOJIS[entry.mood - 1] : null;
  const energyLabels = ['', 'Faible', 'Moyen-', 'Moyen', 'Bon', "Plein d'energie"];

  return (
    <div className="flex gap-3">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        <div className="h-3 w-3 rounded-full bg-brand-500 mt-1.5 shrink-0" />
        <div className="w-0.5 flex-1 bg-border" />
      </div>

      <div className="flex-1 pb-4">
        <p className="text-xs text-muted capitalize mb-1">{dayLabel}</p>
        <div className="rounded-xl border border-border bg-white p-3">
          <div className="flex items-center gap-3">
            {moodEmoji && <span className="text-xl">{moodEmoji}</span>}
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 text-xs">
                {entry.energy_level && (
                  <span className="rounded-full bg-brand-500/10 px-2 py-0.5 font-medium text-brand-600">
                    ⚡ {energyLabels[entry.energy_level] || ''}
                  </span>
                )}
                {entry.sleep_hours != null && (
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 font-medium text-blue-600">
                    🛌 {entry.sleep_hours}h
                  </span>
                )}
                {entry.stress_level && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600">
                    Stress: {entry.stress_level}/5
                  </span>
                )}
              </div>
            </div>
          </div>
          {entry.notes && (
            <p className="mt-2 text-xs text-muted leading-relaxed">{entry.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JournalPage() {
  const { userId } = useAuthStore();
  const [entries, setEntries] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const today = formatDate(new Date());

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const from = new Date();
    from.setDate(from.getDate() - 7);

    const [entriesRes, insightsRes] = await Promise.all([
      fetch(`/api/journal?from=${formatDate(from)}&to=${today}`).then(r => r.ok ? r.json() : { entries: [] }),
      fetch('/api/journal/insights').then(r => r.ok ? r.json() : { insights: [] }),
    ]);

    setEntries(entriesRes.entries || []);
    setInsights(insightsRes.insights || []);

    const existing = (entriesRes.entries || []).find((e: any) => e.date === today);
    setTodayEntry(existing || null);
    setLoading(false);
  }, [userId, today]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (data: any) => {
    const res = await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      fetchData();
    }
  };

  if (loading) {
    return (
      <>
        <AppHeader title="Journal" />
        <div className="p-4 md:p-8 space-y-4">
          <div className="h-6 w-64 animate-pulse rounded-2xl bg-surface" />
          <div className="h-48 animate-pulse rounded-2xl bg-surface" />
          <div className="h-32 animate-pulse rounded-2xl bg-surface" />
          <div className="h-24 animate-pulse rounded-2xl bg-surface" />
        </div>
      </>
    );
  }

  const pastEntries = entries.filter(e => e.date !== today);

  return (
    <>
      <AppHeader title="Journal" />
      <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto">
        {/* Desktop title */}
        <h1 className="hidden md:block text-2xl font-extrabold text-text">Journal quotidien</h1>

        {/* Today's date */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h2 className="text-lg font-bold text-text">Comment te sens-tu aujourd&apos;hui ?</h2>
          </div>
          {saved && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 animate-in fade-in">
              Enregistre !
            </span>
          )}
        </div>

        {/* Journal form */}
        <div className="rounded-2xl border border-border bg-white p-4 md:p-6 shadow-sm">
          <JournalEntryForm
            date={today}
            initialData={todayEntry || undefined}
            onSave={handleSave}
          />
        </div>

        {/* Last 7 days - mini cards */}
        {pastEntries.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-bold text-text">7 derniers jours</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {pastEntries.map(entry => (
                <MiniCard key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        )}

        {/* Timeline of past entries */}
        <div>
          <h3 className="mb-3 text-sm font-bold text-text">Historique</h3>
          {pastEntries.length > 0 ? (
            <div>
              {pastEntries.map(entry => (
                <TimelineEntry key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="📔"
              title="Aucune entree precedente"
              description="Remplissez votre journal chaque jour pour suivre votre bien-etre"
            />
          )}
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-bold text-text">Insights</h3>
            <div className="space-y-2">
              {insights.map((insight: any, i: number) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-xl p-3 text-sm ${
                    insight.type === 'positive'
                      ? 'bg-green-50 text-green-800'
                      : insight.type === 'negative'
                      ? 'bg-red-50 text-red-800'
                      : 'bg-blue-50 text-blue-800'
                  }`}
                >
                  <span className="text-base">
                    {insight.type === 'positive' ? '✅' : insight.type === 'negative' ? '⚠️' : '💡'}
                  </span>
                  <p className="text-xs font-medium">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

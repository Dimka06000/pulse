'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppHeader } from '@/components/pulse/app-header';
import { Badge } from '@/components/pulse/badge';
import { EmptyState } from '@/components/pulse/empty-state';
import { CreateSessionModal } from '@/components/pulse/create-session-modal';
import { useAuthStore } from '@/stores/auth';
import { SPORT_EMOJIS, SPORT_LABELS } from '@/lib/sports';
import type { Sport } from '@/lib/sports';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface PlanningItem {
  id: string;
  type: 'booking' | 'solo';
  title: string;
  sport?: string;
  scheduled_at: string;
  duration: number;
  status: string;
  completed?: boolean;
  coachName?: string;
}

// Get Monday of the current week
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Generate 7 days starting from Monday
function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function WeekCalendar({ items, weekStart }: { items: PlanningItem[]; weekStart: Date }) {
  const days = getWeekDays(weekStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build a set of day strings that have sessions
  const sessionDays = useMemo(() => {
    const set = new Set<string>();
    items.forEach(item => {
      if (item.status !== 'cancelled') {
        const d = new Date(item.scheduled_at);
        set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      }
    });
    return set;
  }, [items]);

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const isToday = day.getTime() === today.getTime();
          const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
          const hasSession = sessionDays.has(dayKey);

          return (
            <div
              key={i}
              className={`flex flex-col items-center gap-1 rounded-xl py-3 px-1 transition ${
                isToday ? 'bg-brand-500/10 ring-2 ring-brand-500' : ''
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase ${
                isToday ? 'text-brand-500' : 'text-muted'
              }`}>
                {DAY_NAMES[i]}
              </span>
              <span className={`text-sm font-bold ${
                isToday ? 'text-brand-500' : 'text-text'
              }`}>
                {day.getDate()}
              </span>
              {hasSession ? (
                <span className="h-2 w-2 rounded-full bg-green-500" />
              ) : (
                <span className="h-2 w-2" /> // spacer to keep alignment
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PlanningPage() {
  const { userId } = useAuthStore();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [items, setItems] = useState<PlanningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const weekStart = useMemo(() => getWeekStart(new Date()), []);

  const fetchAll = useCallback(() => {
    if (!userId) return;
    setLoading(true);

    Promise.all([
      fetch('/api/bookings/me').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/solo-sessions').then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([bookings, solos]) => {
        const bookingItems: PlanningItem[] = (Array.isArray(bookings) ? bookings : []).map((b: any) => ({
          id: b.id,
          type: 'booking' as const,
          title: b.session_templates?.title || 'Seance',
          sport: b.session_templates?.sport || '',
          scheduled_at: b.scheduled_at,
          duration: b.session_templates?.duration || 60,
          status: b.status,
        }));

        const soloItems: PlanningItem[] = (Array.isArray(solos) ? solos : []).map((s: any) => ({
          id: s.id,
          type: 'solo' as const,
          title: s.title || 'Seance solo',
          sport: s.sport,
          scheduled_at: s.scheduled_at,
          duration: s.duration_minutes,
          status: s.completed ? 'completed' : 'confirmed',
          completed: s.completed,
        }));

        setItems([...bookingItems, ...soloItems].sort(
          (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        ));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const now = new Date();
  const upcoming = items.filter(i => new Date(i.scheduled_at) > now && i.status !== 'cancelled' && i.status !== 'completed');
  const past = items.filter(i => new Date(i.scheduled_at) <= now || i.status === 'completed');
  const list = tab === 'upcoming' ? upcoming : past;

  const statusBadge: Record<string, { variant: 'success' | 'info' | 'danger' | 'warning'; label: string }> = {
    confirmed: { variant: 'success', label: 'Confirme' },
    completed: { variant: 'info', label: 'Termine' },
    cancelled: { variant: 'danger', label: 'Annule' },
    pending: { variant: 'warning', label: 'En attente' },
  };

  const toggleComplete = async (item: PlanningItem) => {
    if (item.type !== 'solo') return;
    const newCompleted = !item.completed;
    try {
      const res = await fetch(`/api/solo-sessions/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompleted }),
      });
      if (res.ok) {
        // Update streak when completing
        if (newCompleted) {
          await fetch('/api/streaks', { method: 'POST' }).catch(() => {});
        }
        fetchAll();
      }
    } catch { /* ignore */ }
  };

  const deleteSolo = async (id: string) => {
    try {
      const res = await fetch(`/api/solo-sessions/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAll();
    } catch { /* ignore */ }
  };

  return (
    <>
      <AppHeader title="Mon planning" />
      <div className="p-4 md:p-8">
        <h1 className="hidden md:block text-2xl font-extrabold text-text mb-6">Mon planning</h1>

        {/* Week calendar */}
        {loading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-surface mb-6" />
        ) : (
          <div className="mb-6">
            <WeekCalendar items={items} weekStart={weekStart} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('upcoming')} className={`rounded-full px-5 py-2 text-sm font-semibold transition ${tab === 'upcoming' ? 'bg-gradient-to-r from-brand-500 to-cyan-500 text-white' : 'bg-surface text-muted'}`}>
            A venir ({upcoming.length})
          </button>
          <button onClick={() => setTab('past')} className={`rounded-full px-5 py-2 text-sm font-semibold transition ${tab === 'past' ? 'bg-gradient-to-r from-brand-500 to-cyan-500 text-white' : 'bg-surface text-muted'}`}>
            Passees ({past.length})
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-surface" />)}</div>
        ) : list.length > 0 ? (
          <div className="space-y-3">
            {list.map((item) => {
              const badge = statusBadge[item.status] || { variant: 'sport' as const, label: item.status };
              const sportEmoji = item.sport ? (SPORT_EMOJIS[item.sport as Sport] || '⚡') : '📅';
              return (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-4 rounded-xl border border-border bg-white p-4">
                  {/* Checkbox for solo sessions */}
                  {item.type === 'solo' && tab === 'upcoming' && (
                    <button
                      onClick={() => toggleComplete(item)}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                        item.completed
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-gray-300 hover:border-brand-500'
                      }`}
                    >
                      {item.completed && <span className="text-xs">✓</span>}
                    </button>
                  )}

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface text-xl shrink-0">
                    {sportEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-text truncate">{item.title}</p>
                      {item.type === 'solo' && (
                        <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-500 shrink-0">Solo</span>
                      )}
                    </div>
                    <p className="text-xs text-muted">
                      {new Date(item.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {item.sport && ` · ${SPORT_LABELS[item.sport as Sport] || item.sport}`}
                      {' · '}{item.duration} min
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    {item.type === 'solo' && (
                      <button
                        onClick={() => deleteSolo(item.id)}
                        className="text-muted hover:text-danger transition text-sm"
                        title="Supprimer"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="📅"
            title={tab === 'upcoming' ? 'Aucune seance prevue' : 'Pas encore de seance'}
            description={tab === 'upcoming' ? 'Planifiez votre premiere seance pour commencer' : 'Vos seances passees apparaitront ici'}
            actionLabel={tab === 'upcoming' ? 'Nouvelle seance' : undefined}
            onAction={tab === 'upcoming' ? () => setShowModal(true) : undefined}
          />
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 text-white text-2xl shadow-lg hover:scale-105 transition-transform md:bottom-8"
        title="Nouvelle seance"
      >
        +
      </button>

      <CreateSessionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={fetchAll}
      />
    </>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

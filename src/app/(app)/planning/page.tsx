'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  type: 'booking' | 'solo' | 'club_event';
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

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function dateToISO(date: Date): string {
  // Returns YYYY-MM-DDTHH:MM for datetime-local input
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T09:00`;
}

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function WeekCalendar({
  items,
  weekStart,
  selectedDate,
  onSelectDate,
}: {
  items: PlanningItem[];
  weekStart: Date;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}) {
  const days = getWeekDays(weekStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate !== null && isSameDay(day, selectedDate);
          const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
          const hasSession = sessionDays.has(dayKey);

          return (
            <button
              key={i}
              onClick={() => onSelectDate(new Date(day))}
              className={`flex flex-col items-center gap-1 rounded-xl py-3 px-1 transition ${
                isSelected
                  ? 'bg-brand-500 ring-2 ring-brand-500'
                  : isToday
                    ? 'bg-brand-500/10 ring-2 ring-brand-500'
                    : 'hover:bg-surface'
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase ${
                isSelected ? 'text-white' : isToday ? 'text-brand-500' : 'text-muted'
              }`}>
                {DAY_NAMES[i]}
              </span>
              <span className={`text-sm font-bold ${
                isSelected ? 'text-white' : isToday ? 'text-brand-500' : 'text-text'
              }`}>
                {day.getDate()}
              </span>
              {hasSession ? (
                <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-white/80' : 'bg-green-500'}`} />
              ) : (
                <span className="h-2 w-2" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Quick-add cards shown when no sessions on selected date
function QuickAddCards({ date, onCreateSolo }: { date: Date; onCreateSolo: () => void }) {
  const router = useRouter();
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
      <button
        onClick={onCreateSolo}
        className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-white p-4 w-32 text-center shadow-sm hover:shadow-md transition"
      >
        <span className="text-2xl">🏋️</span>
        <span className="text-xs font-semibold text-text leading-tight">Séance solo</span>
      </button>
      <button
        onClick={() => router.push('/explore')}
        className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-white p-4 w-32 text-center shadow-sm hover:shadow-md transition"
      >
        <span className="text-2xl">🔍</span>
        <span className="text-xs font-semibold text-text leading-tight">Réserver un coach</span>
      </button>
      <button
        onClick={() => router.push('/programs')}
        className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-white p-4 w-32 text-center shadow-sm hover:shadow-md transition"
      >
        <span className="text-2xl">📋</span>
        <span className="text-xs font-semibold text-text leading-tight">Programme du jour</span>
      </button>
    </div>
  );
}

export default function PlanningPage() {
  const { userId } = useAuthStore();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [items, setItems] = useState<PlanningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [garminConnected, setGarminConnected] = useState(false);
  const [pushingWatch, setPushingWatch] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Selected date — default to today
  const todayInit = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [selectedDate, setSelectedDate] = useState<Date | null>(todayInit);
  const [filterByDate, setFilterByDate] = useState(true);

  // Touch swipe state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const weekStart = useMemo(() => {
    const d = getWeekStart(new Date());
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const fetchAll = useCallback(() => {
    if (!userId) return;
    setLoading(true);

    Promise.all([
      fetch('/api/bookings/me').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/solo-sessions').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/clubs/my-events').then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([bookings, solos, clubEvents]) => {
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

        const clubEventItems: PlanningItem[] = (Array.isArray(clubEvents) ? clubEvents : []).map((e: any) => {
          const startMs = new Date(e.starts_at).getTime();
          const endMs = e.ends_at ? new Date(e.ends_at).getTime() : startMs + 60 * 60 * 1000;
          return {
            id: e.id,
            type: 'club_event' as const,
            title: `🏟️ ${e.title}${e.club_name ? ` · ${e.club_name}` : ''}`,
            sport: e.sport || '',
            scheduled_at: e.starts_at,
            duration: Math.round((endMs - startMs) / 60000),
            status: 'confirmed',
          };
        });

        setItems([...bookingItems, ...soloItems, ...clubEventItems].sort(
          (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        ));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Check Garmin connection
  useEffect(() => {
    fetch('/api/connectors')
      .then(r => r.ok ? r.json() : { connections: [] })
      .then(d => {
        const conns = d.connections || [];
        setGarminConnected(conns.some((c: any) => c.provider === 'garmin' && c.is_active));
      })
      .catch(() => {});
  }, []);

  const handlePushWatch = async () => {
    setPushingWatch(true);
    setPushResult(null);
    try {
      const res = await fetch('/api/planning/push-watch', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPushResult(`✅ ${data.pushed} séance${data.pushed > 1 ? 's' : ''} envoyée${data.pushed > 1 ? 's' : ''} !`);
      } else {
        setPushResult(`❌ ${data.error}`);
      }
      setTimeout(() => setPushResult(null), 5000);
    } catch {
      setPushResult('❌ Erreur de connexion');
    }
    setPushingWatch(false);
  };

  // Navigate to a different day and update week view if needed
  const goToDay = useCallback((date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    setSelectedDate(newDate);
    setFilterByDate(true);

    // Update week offset if the new date is outside the current week
    const baseWeekStart = getWeekStart(new Date());
    const targetWeekStart = getWeekStart(newDate);
    const diffMs = targetWeekStart.getTime() - baseWeekStart.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
    setWeekOffset(diffWeeks);
  }, []);

  const handleSelectDate = useCallback((date: Date) => {
    goToDay(date);
    setTab('upcoming');
  }, [goToDay]);

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    // Only trigger if horizontal swipe dominates
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    if (!selectedDate) return;
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + (dx < 0 ? 1 : -1));
    goToDay(next);
  };

  const now = new Date();
  const upcoming = items.filter(i => new Date(i.scheduled_at) > now && i.status !== 'cancelled' && i.status !== 'completed');
  const past = items.filter(i => new Date(i.scheduled_at) <= now || i.status === 'completed');

  // Apply date filter
  const filteredUpcoming = filterByDate && selectedDate
    ? upcoming.filter(i => isSameDay(new Date(i.scheduled_at), selectedDate))
    : upcoming;
  const filteredPast = filterByDate && selectedDate
    ? past.filter(i => isSameDay(new Date(i.scheduled_at), selectedDate))
    : past;

  const list = tab === 'upcoming' ? filteredUpcoming : filteredPast;

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

  const defaultDateForModal = selectedDate ? dateToISO(selectedDate) : undefined;

  return (
    <>
      <AppHeader title="Mon planning" />
      <div className="p-4 md:p-8">
        <h1 className="hidden md:block text-2xl font-extrabold text-text mb-6">Mon planning</h1>

        {/* Week calendar with navigation */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-muted hover:bg-surface/80 transition"
            >
              ←
            </button>
            <div className="text-center">
              <button
                onClick={() => setWeekOffset(0)}
                className="text-xs font-semibold text-muted hover:text-text transition"
              >
                {weekOffset === 0 ? 'Cette semaine' :
                 `${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
              </button>
            </div>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-muted hover:bg-surface/80 transition"
            >
              →
            </button>
          </div>
          {loading ? (
            <div className="h-24 animate-pulse rounded-2xl bg-surface" />
          ) : (
            <WeekCalendar
              items={items}
              weekStart={weekStart}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
            />
          )}
        </div>

        {/* Date header + Tout voir */}
        {filterByDate && selectedDate && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-text capitalize">
              {formatDayHeader(selectedDate)}
            </h2>
            <button
              onClick={() => setFilterByDate(false)}
              className="text-xs font-semibold text-brand-500 hover:underline"
            >
              Tout voir
            </button>
          </div>
        )}

        {/* Tabs + Push watch */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('upcoming')}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === 'upcoming' ? 'bg-gradient-to-r from-brand-500 to-cyan-500 text-white' : 'bg-surface text-muted'}`}
            >
              À venir ({filterByDate && selectedDate ? filteredUpcoming.length : upcoming.length})
            </button>
            <button
              onClick={() => setTab('past')}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === 'past' ? 'bg-gradient-to-r from-brand-500 to-cyan-500 text-white' : 'bg-surface text-muted'}`}
            >
              Passées ({filterByDate && selectedDate ? filteredPast.length : past.length})
            </button>
          </div>
          {garminConnected && upcoming.length > 0 && (
            <button
              onClick={handlePushWatch}
              disabled={pushingWatch}
              className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
            >
              ⌚ {pushingWatch ? 'Envoi...' : 'Sur ma montre'}
            </button>
          )}
        </div>
        {pushResult && (
          <div className={`mb-4 rounded-xl p-3 text-sm font-medium ${pushResult.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {pushResult}
          </div>
        )}

        {/* Session list with swipe support */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-surface" />)}</div>
          ) : list.length > 0 ? (
            <div className="space-y-3">
              {list.map((item) => {
                const badge = statusBadge[item.status] || { variant: 'sport' as const, label: item.status };
                const sportEmoji = item.sport ? (SPORT_EMOJIS[item.sport as Sport] || '⚡') : '📅';
                return (
                  <div key={`${item.type}-${item.id}`} className="flex items-center gap-4 rounded-xl border border-border bg-white p-4">
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
          ) : filterByDate && selectedDate && tab === 'upcoming' ? (
            // Empty state for selected date with quick-add cards
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface/50 py-6">
                <span className="text-3xl">📅</span>
                <div>
                  <p className="font-semibold text-text text-sm">Aucune séance</p>
                  <p className="text-xs text-muted">Ajoutez une activité pour ce jour</p>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white text-lg font-bold hover:scale-105 transition-transform"
                >
                  +
                </button>
              </div>
              <QuickAddCards date={selectedDate} onCreateSolo={() => setShowModal(true)} />
            </div>
          ) : (
            <EmptyState
              icon="📅"
              title={tab === 'upcoming' ? 'Aucune séance prévue' : 'Pas encore de séance'}
              description={tab === 'upcoming' ? 'Planifiez votre première séance pour commencer' : 'Vos séances passées apparaîtront ici'}
              actionLabel={tab === 'upcoming' ? 'Nouvelle séance' : undefined}
              onAction={tab === 'upcoming' ? () => setShowModal(true) : undefined}
            />
          )}
        </div>
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
        defaultDate={defaultDateForModal}
      />
    </>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

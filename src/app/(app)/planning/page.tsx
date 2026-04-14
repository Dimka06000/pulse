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

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

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

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function dateToISO(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T09:00`;
}

const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Sport accent colors for left border (Tailwind safe-listed via inline style)
const SPORT_ACCENT: Record<string, string> = {
  crossfit: '#ef4444',
  yoga: '#8b5cf6',
  running: '#3b82f6',
  trail: '#10b981',
  boxe: '#f59e0b',
  musculation: '#10b981',
  fitness: '#f97316',
  pilates: '#a78bfa',
  meditation: '#6366f1',
  natation: '#0ea5e9',
  cyclisme: '#14b8a6',
  triathlon: '#0ea5e9',
  duathlon: '#22c55e',
  autre: '#64748b',
};

function getSportAccent(sport?: string): string {
  if (!sport) return '#94a3b8';
  return SPORT_ACCENT[sport] || '#94a3b8';
}

// Session dot color based on item state
function getSessionDotColor(items: PlanningItem[], day: Date, isSelected: boolean): string | null {
  const dayItems = items.filter(i => i.status !== 'cancelled' && isSameDay(new Date(i.scheduled_at), day));
  if (dayItems.length === 0) return null;
  if (isSelected) return 'white';
  const hasCompleted = dayItems.some(i => i.status === 'completed' || i.completed);
  return hasCompleted ? '#22c55e' : 'var(--brand-500, #06b6d4)';
}

function WeekCalendar({
  items,
  weekStart,
  selectedDate,
  onSelectDate,
  weekOffset,
  onWeekChange,
}: {
  items: PlanningItem[];
  weekStart: Date;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  weekOffset: number;
  onWeekChange: (delta: number) => void;
}) {
  const days = getWeekDays(weekStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthLabel = formatMonthYear(weekStart);

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
      {/* Month + navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <button
          onClick={() => onWeekChange(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface transition text-sm"
          aria-label="Semaine précédente"
        >
          ←
        </button>
        <button
          onClick={() => onWeekChange(-weekOffset)}
          className="text-sm font-semibold text-text capitalize hover:text-brand-500 transition"
        >
          {weekOffset === 0 ? monthLabel : monthLabel}
        </button>
        <button
          onClick={() => onWeekChange(1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface transition text-sm"
          aria-label="Semaine suivante"
        >
          →
        </button>
      </div>

      {/* Day pills */}
      <div className="grid grid-cols-7 gap-1 px-2 py-3">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate !== null && isSameDay(day, selectedDate);
          const dotColor = getSessionDotColor(items, day, isSelected);

          return (
            <button
              key={i}
              onClick={() => onSelectDate(new Date(day))}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-2 px-1 transition ${
                isSelected
                  ? 'bg-brand-500'
                  : isToday
                    ? 'bg-brand-500/8 ring-1 ring-brand-500/30'
                    : 'hover:bg-surface'
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                isSelected ? 'text-white/80' : isToday ? 'text-brand-500' : 'text-muted'
              }`}>
                {DAY_NAMES_SHORT[i]}
              </span>
              <span className={`text-sm font-bold leading-none mt-0.5 ${
                isSelected ? 'text-white' : isToday ? 'text-brand-500' : 'text-text'
              }`}>
                {day.getDate()}
              </span>
              {/* Session / today dot */}
              <span
                className="h-1.5 w-1.5 rounded-full mt-0.5"
                style={{
                  backgroundColor: dotColor ?? 'transparent',
                }}
              />
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
  void date;
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
      <button
        onClick={onCreateSolo}
        className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-white p-4 w-28 text-center hover:border-brand-500/40 hover:shadow-sm transition"
      >
        <span className="text-2xl">🏋️</span>
        <span className="text-[11px] font-semibold text-text leading-tight">Séance solo</span>
      </button>
      <button
        onClick={() => router.push('/explore')}
        className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-white p-4 w-28 text-center hover:border-brand-500/40 hover:shadow-sm transition"
      >
        <span className="text-2xl">🔍</span>
        <span className="text-[11px] font-semibold text-text leading-tight">Réserver un coach</span>
      </button>
      <button
        onClick={() => router.push('/programs')}
        className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-white p-4 w-28 text-center hover:border-brand-500/40 hover:shadow-sm transition"
      >
        <span className="text-2xl">📋</span>
        <span className="text-[11px] font-semibold text-text leading-tight">Programme du jour</span>
      </button>
    </div>
  );
}

// Type badge variants
function TypeBadge({ type }: { type: PlanningItem['type'] }) {
  if (type === 'solo') return (
    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 border border-blue-100 shrink-0">
      Solo
    </span>
  );
  if (type === 'booking') return (
    <span className="rounded-full bg-brand-500/8 px-2 py-0.5 text-[10px] font-semibold text-brand-500 border border-brand-500/20 shrink-0">
      Coach
    </span>
  );
  return (
    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-600 border border-purple-100 shrink-0">
      Club
    </span>
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

  const todayInit = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [selectedDate, setSelectedDate] = useState<Date | null>(todayInit);
  const [filterByDate, setFilterByDate] = useState(true);

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
          title: b.session_templates?.title || 'Séance',
          sport: b.session_templates?.sport || '',
          scheduled_at: b.scheduled_at,
          duration: b.session_templates?.duration || 60,
          status: b.status,
        }));

        const soloItems: PlanningItem[] = (Array.isArray(solos) ? solos : []).map((s: any) => ({
          id: s.id,
          type: 'solo' as const,
          title: s.title || 'Séance solo',
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

  const goToDay = useCallback((date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    setSelectedDate(newDate);
    setFilterByDate(true);

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

  const handleWeekChange = useCallback((delta: number) => {
    setWeekOffset(w => w + delta);
  }, []);

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

    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    if (!selectedDate) return;
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + (dx < 0 ? 1 : -1));
    goToDay(next);
  };

  const now = new Date();
  const upcoming = items.filter(i => new Date(i.scheduled_at) > now && i.status !== 'cancelled' && i.status !== 'completed');
  const past = items.filter(i => new Date(i.scheduled_at) <= now || i.status === 'completed');

  const filteredUpcoming = filterByDate && selectedDate
    ? upcoming.filter(i => isSameDay(new Date(i.scheduled_at), selectedDate))
    : upcoming;
  const filteredPast = filterByDate && selectedDate
    ? past.filter(i => isSameDay(new Date(i.scheduled_at), selectedDate))
    : past;

  const list = tab === 'upcoming' ? filteredUpcoming : filteredPast;

  const statusConfig: Record<string, { label: string; className: string }> = {
    confirmed: { label: 'Confirmé', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
    completed: { label: 'Terminé', className: 'bg-gray-100 text-gray-500 border border-gray-200' },
    cancelled: { label: 'Annulé', className: 'bg-red-50 text-red-600 border border-red-100' },
    pending: { label: 'En attente', className: 'bg-amber-50 text-amber-700 border border-amber-100' },
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

        {/* Week calendar */}
        <div className="mb-4">
          {loading ? (
            <div className="h-28 animate-pulse rounded-2xl bg-surface" />
          ) : (
            <WeekCalendar
              items={items}
              weekStart={weekStart}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              weekOffset={weekOffset}
              onWeekChange={handleWeekChange}
            />
          )}
        </div>

        {/* Date header */}
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

        {/* Tabs + push watch */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1.5 bg-surface rounded-xl p-1">
            <button
              onClick={() => setTab('upcoming')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tab === 'upcoming'
                  ? 'bg-white text-text shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              À venir ({filterByDate && selectedDate ? filteredUpcoming.length : upcoming.length})
            </button>
            <button
              onClick={() => setTab('past')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tab === 'past'
                  ? 'bg-white text-text shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              Passées ({filterByDate && selectedDate ? filteredPast.length : past.length})
            </button>
          </div>
          {garminConnected && upcoming.length > 0 && (
            <button
              onClick={handlePushWatch}
              disabled={pushingWatch}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
            >
              ⌚ {pushingWatch ? 'Envoi...' : 'Sur ma montre'}
            </button>
          )}
        </div>

        {pushResult && (
          <div className={`mb-4 rounded-xl p-3 text-sm font-medium ${pushResult.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
            {pushResult}
          </div>
        )}

        {/* Session list with swipe support */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />)}
            </div>
          ) : list.length > 0 ? (
            <div className="space-y-2.5">
              {list.map((item) => {
                const sportEmoji = item.sport ? (SPORT_EMOJIS[item.sport as Sport] || '⚡') : '📅';
                const accentColor = getSportAccent(item.sport);
                const timeStr = new Date(item.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                const status = statusConfig[item.status] || { label: item.status, className: 'bg-gray-100 text-gray-500 border border-gray-200' };
                const isCompleted = item.completed || item.status === 'completed';

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className={`flex items-center gap-3 rounded-2xl border border-border bg-white overflow-hidden transition ${isCompleted ? 'opacity-60' : ''}`}
                    style={{ borderLeftWidth: 3, borderLeftColor: accentColor }}
                  >
                    {/* Completion toggle for solo */}
                    {item.type === 'solo' && tab === 'upcoming' && (
                      <button
                        onClick={() => toggleComplete(item)}
                        className={`ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          item.completed
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-gray-300 hover:border-brand-500'
                        }`}
                      >
                        {item.completed && <span className="text-[9px]">✓</span>}
                      </button>
                    )}

                    {/* Sport emoji */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-lg ml-3">
                      {sportEmoji}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`text-sm font-bold text-text truncate ${isCompleted ? 'line-through' : ''}`}>
                          {item.title}
                        </p>
                        <TypeBadge type={item.type} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted font-medium tabular-nums">{timeStr}</span>
                        <span className="text-muted text-xs">·</span>
                        <span className="text-xs text-muted">{item.duration} min</span>
                        {item.sport && (
                          <>
                            <span className="text-muted text-xs">·</span>
                            <span className="text-xs text-muted">{SPORT_LABELS[item.sport as Sport] || item.sport}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status + actions */}
                    <div className="flex items-center gap-2 pr-3 shrink-0">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>
                        {status.label}
                      </span>
                      {item.type === 'solo' && (
                        <button
                          onClick={() => deleteSolo(item.id)}
                          className="text-muted/50 hover:text-red-400 transition text-sm"
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
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-dashed border-border bg-white py-5 px-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="font-semibold text-text text-sm">Aucune séance prévue</p>
                    <p className="text-xs text-muted">Ajoutez une activité pour ce jour</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white text-lg font-bold hover:scale-105 transition-transform"
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
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white text-2xl shadow-lg hover:scale-105 transition-transform md:bottom-8"
        title="Nouvelle séance"
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

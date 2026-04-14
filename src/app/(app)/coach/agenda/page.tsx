'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';

/* eslint-disable @typescript-eslint/no-explicit-any */

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h-20h

interface Booking {
  id: string;
  scheduled_at: string;
  end_at: string;
  status: string;
  athlete_name: string;
  session_title: string;
  sport: string;
}

interface AvailabilitySlot {
  id: string;
  day_of_week: number; // 0=sunday, 1=monday...
  start_time: string;
  end_time: string;
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

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function formatHour(h: number): string {
  return `${h}h`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

// Mobile day view component
function DayView({
  day,
  dayIdx,
  bookingsByDay,
  availByDay,
}: {
  day: Date;
  dayIdx: number;
  bookingsByDay: Map<string, Booking[]>;
  availByDay: Map<number, AvailabilitySlot[]>;
}) {
  const daySlots = availByDay.get(dayIdx) || [];
  const dayBookings = bookingsByDay.get(day.toDateString()) || [];

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden">
      {HOURS.map(hour => {
        const isAvailable = daySlots.some(s => {
          const start = timeToMinutes(s.start_time);
          const end = timeToMinutes(s.end_time);
          return hour * 60 >= start && hour * 60 < end;
        });
        const hourBooking = dayBookings.find(b => new Date(b.scheduled_at).getHours() === hour);

        return (
          <div
            key={hour}
            className={`flex items-start border-b border-border/30 min-h-[52px] ${
              isAvailable && !hourBooking ? 'bg-green-50/60' : ''
            }`}
          >
            <div className="w-12 shrink-0 pt-1 pr-2 text-right">
              <span className="text-[10px] text-muted">{formatHour(hour)}</span>
            </div>
            <div className="flex-1 p-1">
              {hourBooking && (
                <div className={`rounded-lg px-3 py-2 text-xs leading-tight ${
                  hourBooking.status === 'confirmed'
                    ? 'bg-brand-500 text-white'
                    : hourBooking.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                }`}>
                  <p className="font-bold">{hourBooking.athlete_name || 'Client'}</p>
                  <p className="opacity-80">{hourBooking.session_title}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CoachAgendaPage() {
  const { userId } = useAuthStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Mobile selected day
  const todayInit = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [selectedDay, setSelectedDay] = useState<Date>(todayInit);

  // Touch swipe
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const weekStart = useMemo(() => {
    const d = getWeekStart(new Date());
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [bookingsRes, availRes] = await Promise.all([
      fetch(`/api/coaches/me/sessions?from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/coaches/me/availability').then(r => r.ok ? r.json() : []).catch(() => []),
    ]);

    setBookings(Array.isArray(bookingsRes) ? bookingsRes : []);
    setAvailability(Array.isArray(availRes) ? availRes : []);
    setLoading(false);
  }, [userId, weekStart]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group bookings by day
  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const dayKey = new Date(b.scheduled_at).toDateString();
      const arr = map.get(dayKey) || [];
      arr.push(b);
      map.set(dayKey, arr);
    }
    return map;
  }, [bookings]);

  // Map availability to day indexes
  const availByDay = useMemo(() => {
    const map = new Map<number, AvailabilitySlot[]>();
    for (const slot of availability) {
      const idx = slot.day_of_week === 0 ? 6 : slot.day_of_week - 1;
      const arr = map.get(idx) || [];
      arr.push(slot);
      map.set(idx, arr);
    }
    return map;
  }, [availability]);

  const weekLabel = `${days[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${days[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  // Navigate to a different day and sync week view
  const goToDay = useCallback((date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    setSelectedDay(newDate);

    // Update week offset if outside current week
    const baseWeekStart = getWeekStart(new Date());
    const targetWeekStart = getWeekStart(newDate);
    const diffMs = targetWeekStart.getTime() - baseWeekStart.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
    setWeekOffset(diffWeeks);
  }, []);

  // Touch handlers for swipe
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
    const next = new Date(selectedDay);
    next.setDate(next.getDate() + (dx < 0 ? 1 : -1));
    goToDay(next);
  };

  // Index of selectedDay in the current week (0=Mon, …, 6=Sun), -1 if outside
  const selectedDayIdx = useMemo(() => {
    return days.findIndex(d => isSameDay(d, selectedDay));
  }, [days, selectedDay]);

  const selectedDayLabel = selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-extrabold text-text">Agenda</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              // On mobile navigate day by day, on desktop week by week
              if (window.innerWidth < 768) {
                const prev = new Date(selectedDay);
                prev.setDate(prev.getDate() - 1);
                goToDay(prev);
              } else {
                setWeekOffset(w => w - 1);
              }
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-muted hover:bg-surface/80"
          >
            ←
          </button>
          <button
            onClick={() => {
              goToDay(new Date());
              setWeekOffset(0);
            }}
            className="rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface/80"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                const next = new Date(selectedDay);
                next.setDate(next.getDate() + 1);
                goToDay(next);
              } else {
                setWeekOffset(w => w + 1);
              }
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-muted hover:bg-surface/80"
          >
            →
          </button>
        </div>
      </div>

      {/* Mobile: day name + date picker strip */}
      <div className="md:hidden mb-4">
        <p className="text-sm font-bold text-text capitalize mb-3">{selectedDayLabel}</p>
        {/* Day strip for week navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {days.map((day, i) => {
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDay);
            const dayBookings = bookingsByDay.get(day.toDateString()) || [];
            return (
              <button
                key={i}
                onClick={() => goToDay(day)}
                className={`flex shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2 transition ${
                  isSelected
                    ? 'bg-brand-500'
                    : isToday
                      ? 'bg-brand-500/10 ring-2 ring-brand-500'
                      : 'bg-surface'
                }`}
              >
                <span className={`text-[10px] font-semibold uppercase ${isSelected ? 'text-white' : isToday ? 'text-brand-500' : 'text-muted'}`}>
                  {DAY_NAMES[i]}
                </span>
                <span className={`text-sm font-bold ${isSelected ? 'text-white' : isToday ? 'text-brand-500' : 'text-text'}`}>
                  {day.getDate()}
                </span>
                {dayBookings.length > 0 && (
                  <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white/80' : 'bg-brand-500'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: week label */}
      <p className="hidden md:block text-sm text-muted mb-4">{weekLabel}</p>

      {loading ? (
        <div className="h-96 animate-pulse rounded-2xl bg-surface" />
      ) : (
        <>
          {/* Mobile: single day view */}
          <div
            className="md:hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <DayView
              day={selectedDay}
              dayIdx={selectedDayIdx >= 0 ? selectedDayIdx : 0}
              bookingsByDay={bookingsByDay}
              availByDay={availByDay}
            />
          </div>

          {/* Desktop: full week grid */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-border bg-white">
            <div className="min-w-[700px]">
              {/* Day headers */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
                <div className="p-2" />
                {days.map((day, i) => {
                  const isToday = day.toDateString() === today.toDateString();
                  const dayBookings = bookingsByDay.get(day.toDateString()) || [];
                  return (
                    <div key={i} className={`p-2 text-center border-l border-border ${isToday ? 'bg-brand-500/5' : ''}`}>
                      <p className={`text-[10px] font-semibold uppercase ${isToday ? 'text-brand-500' : 'text-muted'}`}>
                        {DAY_NAMES[i]}
                      </p>
                      <p className={`text-lg font-bold ${isToday ? 'text-brand-500' : 'text-text'}`}>
                        {day.getDate()}
                      </p>
                      {dayBookings.length > 0 && (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Time grid */}
              {HOURS.map(hour => (
                <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/30 min-h-[48px]">
                  <div className="p-1 text-right pr-2">
                    <span className="text-[10px] text-muted">{formatHour(hour)}</span>
                  </div>
                  {days.map((day, dayIdx) => {
                    const isToday = day.toDateString() === today.toDateString();
                    const daySlots = availByDay.get(dayIdx) || [];
                    const isAvailable = daySlots.some(s => {
                      const start = timeToMinutes(s.start_time);
                      const end = timeToMinutes(s.end_time);
                      return hour * 60 >= start && hour * 60 < end;
                    });

                    const dayBookings = bookingsByDay.get(day.toDateString()) || [];
                    const hourBooking = dayBookings.find(b => new Date(b.scheduled_at).getHours() === hour);

                    return (
                      <div
                        key={dayIdx}
                        className={`border-l border-border/30 p-0.5 min-h-[48px] ${
                          isToday ? 'bg-brand-500/3' : ''
                        } ${isAvailable && !hourBooking ? 'bg-green-50/50' : ''}`}
                      >
                        {hourBooking && (
                          <div className={`rounded-lg px-2 py-1 text-[10px] leading-tight ${
                            hourBooking.status === 'confirmed'
                              ? 'bg-brand-500 text-white'
                              : hourBooking.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                          }`}>
                            <p className="font-bold truncate">{hourBooking.athlete_name || 'Client'}</p>
                            <p className="truncate">{hourBooking.session_title}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-surface p-3 text-center">
          <p className="text-lg font-bold text-text">{bookings.filter(b => b.status === 'confirmed').length}</p>
          <p className="text-[10px] text-muted">Confirmées</p>
        </div>
        <div className="rounded-xl bg-surface p-3 text-center">
          <p className="text-lg font-bold text-text">{bookings.filter(b => b.status === 'completed').length}</p>
          <p className="text-[10px] text-muted">Terminées</p>
        </div>
        <div className="rounded-xl bg-surface p-3 text-center">
          <p className="text-lg font-bold text-text">{availability.length}</p>
          <p className="text-[10px] text-muted">Créneaux/sem</p>
        </div>
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

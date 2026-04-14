'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';

/* eslint-disable @typescript-eslint/no-explicit-any */

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h–20h

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

// Status config for booking cards
function bookingCardStyle(status: string): string {
  if (status === 'confirmed') return 'border-l-brand-500 bg-white';
  if (status === 'completed') return 'border-l-emerald-400 bg-white';
  return 'border-l-gray-300 bg-white';
}

function bookingNameColor(status: string): string {
  if (status === 'confirmed') return 'text-text';
  if (status === 'completed') return 'text-emerald-700';
  return 'text-muted';
}

// Mobile day view — clean time grid
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
            className="flex items-start border-b border-border/20 min-h-[52px]"
          >
            {/* Hour label */}
            <div className="w-12 shrink-0 pt-2 pr-2 text-right">
              <span className="text-[10px] text-muted/70 tabular-nums">{formatHour(hour)}</span>
            </div>

            {/* Slot content */}
            <div className={`flex-1 p-1.5 min-h-[52px] ${isAvailable && !hourBooking ? 'bg-emerald-50/40 border-l border-emerald-200/60' : 'border-l border-transparent'}`}>
              {hourBooking && (
                <div
                  className={`rounded-xl border ${bookingCardStyle(hourBooking.status)} px-3 py-2 text-xs leading-tight shadow-sm`}
                  style={{ borderLeftWidth: 3 }}
                >
                  <p className={`font-semibold truncate ${bookingNameColor(hourBooking.status)}`}>
                    {hourBooking.athlete_name || 'Client'}
                  </p>
                  <p className="text-muted mt-0.5 truncate">{hourBooking.session_title}</p>
                  {hourBooking.status === 'completed' && (
                    <span className="mt-1 inline-block rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                      Terminé
                    </span>
                  )}
                </div>
              )}
              {isAvailable && !hourBooking && (
                <p className="text-[10px] text-emerald-600/70 pt-1 pl-1">Disponible</p>
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

  const todayInit = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [selectedDay, setSelectedDay] = useState<Date>(todayInit);

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

  const weekLabel = days[0].toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const goToDay = useCallback((date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    setSelectedDay(newDate);

    const baseWeekStart = getWeekStart(new Date());
    const targetWeekStart = getWeekStart(newDate);
    const diffMs = targetWeekStart.getTime() - baseWeekStart.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
    setWeekOffset(diffWeeks);
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
    const next = new Date(selectedDay);
    next.setDate(next.getDate() + (dx < 0 ? 1 : -1));
    goToDay(next);
  };

  const selectedDayIdx = useMemo(() => {
    return days.findIndex(d => isSameDay(d, selectedDay));
  }, [days, selectedDay]);

  const selectedDayLabel = selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-text">Agenda</h1>
          <p className="text-xs text-muted capitalize mt-0.5">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                const prev = new Date(selectedDay);
                prev.setDate(prev.getDate() - 1);
                goToDay(prev);
              } else {
                setWeekOffset(w => w - 1);
              }
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-muted hover:bg-surface/80 text-sm transition"
          >
            ←
          </button>
          <button
            onClick={() => {
              goToDay(new Date());
              setWeekOffset(0);
            }}
            className="rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:text-text hover:bg-surface/80 transition"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                const next = new Date(selectedDay);
                next.setDate(next.getDate() + 1);
                goToDay(next);
              } else {
                setWeekOffset(w => w + 1);
              }
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-muted hover:bg-surface/80 text-sm transition"
          >
            →
          </button>
        </div>
      </div>

      {/* Mobile: day strip */}
      <div className="md:hidden mb-4">
        <div className="rounded-2xl border border-border bg-white p-3 mb-3">
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDay);
              const dayBookings = bookingsByDay.get(day.toDateString()) || [];
              return (
                <button
                  key={i}
                  onClick={() => goToDay(day)}
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
                    {DAY_NAMES[i]}
                  </span>
                  <span className={`text-sm font-bold leading-none mt-0.5 ${
                    isSelected ? 'text-white' : isToday ? 'text-brand-500' : 'text-text'
                  }`}>
                    {day.getDate()}
                  </span>
                  {dayBookings.length > 0 && (
                    <span className={`h-1.5 w-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white/80' : 'bg-brand-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <p className="text-sm font-semibold text-text capitalize">{selectedDayLabel}</p>
      </div>

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
              <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border/40 bg-surface/30">
                <div className="p-2" />
                {days.map((day, i) => {
                  const isToday = isSameDay(day, today);
                  const dayBookings = bookingsByDay.get(day.toDateString()) || [];
                  return (
                    <div key={i} className={`p-2.5 text-center border-l border-border/30 ${isToday ? 'bg-brand-500/4' : ''}`}>
                      <p className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? 'text-brand-500' : 'text-muted'}`}>
                        {DAY_NAMES[i]}
                      </p>
                      <p className={`text-lg font-bold ${isToday ? 'text-brand-500' : 'text-text'}`}>
                        {day.getDate()}
                      </p>
                      {dayBookings.length > 0 ? (
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${isToday ? 'bg-brand-500' : 'bg-brand-500/60'}`} />
                      ) : (
                        <span className="inline-block h-1.5 w-1.5" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Time grid rows */}
              {HOURS.map(hour => (
                <div key={hour} className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border/20 min-h-[48px]">
                  <div className="p-1 pt-2 text-right pr-2.5">
                    <span className="text-[10px] text-muted/60 tabular-nums">{formatHour(hour)}</span>
                  </div>
                  {days.map((day, dayIdx) => {
                    const isToday = isSameDay(day, today);
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
                        className={`border-l border-border/20 p-0.5 min-h-[48px] ${
                          isToday ? 'bg-brand-500/2' : ''
                        } ${isAvailable && !hourBooking ? 'bg-emerald-50/30' : ''}`}
                      >
                        {/* Availability indicator: subtle left border */}
                        {isAvailable && !hourBooking && (
                          <div className="h-full w-0.5 bg-emerald-300/50 rounded-full ml-0.5" />
                        )}
                        {hourBooking && (
                          <div
                            className={`rounded-lg px-2 py-1.5 text-[10px] leading-tight border ${
                              hourBooking.status === 'confirmed'
                                ? 'border-brand-500/30 bg-white shadow-sm'
                                : hourBooking.status === 'completed'
                                  ? 'border-emerald-200 bg-emerald-50/60'
                                  : 'border-gray-200 bg-gray-50'
                            }`}
                            style={{
                              borderLeftWidth: 3,
                              borderLeftColor: hourBooking.status === 'confirmed'
                                ? 'var(--brand-500, #06b6d4)'
                                : hourBooking.status === 'completed'
                                  ? '#34d399'
                                  : '#cbd5e1',
                            }}
                          >
                            <p className={`font-semibold truncate ${bookingNameColor(hourBooking.status)}`}>
                              {hourBooking.athlete_name || 'Client'}
                            </p>
                            <p className="text-muted truncate mt-0.5">{hourBooking.session_title}</p>
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
        <div className="rounded-2xl border border-border bg-white p-3 text-center">
          <p className="text-lg font-bold text-text">{bookings.filter(b => b.status === 'confirmed').length}</p>
          <p className="text-[10px] text-muted mt-0.5">Confirmées</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-3 text-center">
          <p className="text-lg font-bold text-text">{bookings.filter(b => b.status === 'completed').length}</p>
          <p className="text-[10px] text-muted mt-0.5">Terminées</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-3 text-center">
          <p className="text-lg font-bold text-text">{availability.length}</p>
          <p className="text-[10px] text-muted mt-0.5">Créneaux/sem</p>
        </div>
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

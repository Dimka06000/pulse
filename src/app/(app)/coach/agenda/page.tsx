'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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

export default function CoachAgendaPage() {
  const { userId } = useAuthStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Map availability to day indexes (1=monday in ISO → 0 in our array)
  const availByDay = useMemo(() => {
    const map = new Map<number, AvailabilitySlot[]>();
    for (const slot of availability) {
      // Convert: 0=sun→6, 1=mon→0, 2=tue→1 etc.
      const idx = slot.day_of_week === 0 ? 6 : slot.day_of_week - 1;
      const arr = map.get(idx) || [];
      arr.push(slot);
      map.set(idx, arr);
    }
    return map;
  }, [availability]);

  const weekLabel = `${days[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${days[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-extrabold text-text">Agenda</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-muted hover:bg-surface/80"
          >
            ←
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface/80"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-muted hover:bg-surface/80"
          >
            →
          </button>
        </div>
      </div>
      <p className="text-sm text-muted mb-4">{weekLabel}</p>

      {loading ? (
        <div className="h-96 animate-pulse rounded-2xl bg-surface" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
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

                  // Find booking in this hour
                  const dayBookings = bookingsByDay.get(day.toDateString()) || [];
                  const hourBooking = dayBookings.find(b => {
                    const bHour = new Date(b.scheduled_at).getHours();
                    return bHour === hour;
                  });

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

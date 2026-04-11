'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AppHeader } from '@/components/pulse/app-header';
import { BookingWizard } from '@/components/booking/booking-wizard';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function BookCoachPage() {
  const { id } = useParams<{ id: string }>();
  const [coachName, setCoachName] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [availableDays, setAvailableDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    Promise.all([
      fetch(`/api/coaches/${id}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/slots?coach_id=${id}&list_days=true`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([coach, slotsData]) => {
      if (!coach) {
        setError('Coach introuvable');
        setLoading(false);
        return;
      }

      setCoachName([coach.firstName, coach.lastName].filter(Boolean).join(' ') || 'Coach');
      setSessions((coach.sessionTemplates || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        sport: t.sport,
        level: t.level,
        type: t.type,
        duration: t.duration,
        price: t.price,
        description: t.description || null,
      })));

      // Extract available days from coach availability
      // slotsData.availableDays = ISO day numbers (1=monday..7=sunday)
      if (slotsData?.availableDays) {
        setAvailableDays(slotsData.availableDays);
      } else {
        // Fallback: fetch availability directly
        fetch(`/api/coaches/${id}/availability`)
          .then(r => r.ok ? r.json() : [])
          .then((slots: any[]) => {
            const days = [...new Set((Array.isArray(slots) ? slots : []).map((s: any) => s.day_of_week))];
            setAvailableDays(days);
          })
          .catch(() => setAvailableDays([1, 2, 3, 4, 5])); // default weekdays
      }

      setLoading(false);
    }).catch(() => {
      setError('Erreur de chargement');
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <>
        <AppHeader title="Réserver" />
        <div className="p-4 md:p-8 max-w-lg mx-auto space-y-4">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-surface" />
          <div className="h-32 animate-pulse rounded-2xl bg-surface" />
          <div className="h-32 animate-pulse rounded-2xl bg-surface" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <AppHeader title="Réserver" />
        <div className="flex items-center justify-center p-12">
          <p className="text-sm text-danger">{error}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title={`Réserver — ${coachName}`} />
      <div className="p-4 md:p-8 pb-24">
        <BookingWizard
          coachId={id}
          coachName={coachName}
          sessions={sessions}
          availableDays={availableDays}
        />
      </div>
    </>
  );
}

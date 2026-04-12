'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ClubEventCard } from '@/components/clubs/club-event-card';
import type { ClubEvent } from '@/stores/clubs';

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse space-y-3">
      <div className="h-5 w-24 rounded-full bg-gray-200" />
      <div className="h-4 w-2/3 rounded bg-gray-200" />
      <div className="h-3 w-1/2 rounded bg-gray-200" />
      <div className="h-3 w-1/3 rounded bg-gray-200" />
      <div className="h-9 w-full rounded-lg bg-gray-200 mt-2" />
    </div>
  );
}

export default function ClubEventsPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [clubId, setClubId] = useState<string | null>(null);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Resolve slug → clubId
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/clubs/${slug}?by=slug`)
      .then((r) => r.json())
      .then((json) => {
        if (json.id) setClubId(json.id);
        else setError('Club introuvable');
      })
      .catch(() => setError('Erreur lors du chargement du club'));
  }, [slug]);

  const fetchEvents = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${clubId}/events`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur chargement des événements');
      setEvents(Array.isArray(json) ? json : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRegister = async (eventId: string) => {
    if (!clubId) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/clubs/${clubId}/events/${eventId}/register`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Erreur inscription');
      }
      await fetchEvents();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCancel = async (eventId: string) => {
    if (!clubId) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/clubs/${clubId}/events/${eventId}/register`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Erreur désincription');
      }
      await fetchEvents();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-text">Événements</h1>

      {actionError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl">📅</span>
          <p className="mt-3 font-semibold text-gray-700">Aucun événement à venir</p>
          <p className="mt-1 text-sm text-gray-500">
            Les prochains événements du club apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <ClubEventCard
              key={event.id}
              event={event}
              clubId={clubId!}
              onRegister={() => handleRegister(event.id)}
              onCancel={() => handleCancel(event.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

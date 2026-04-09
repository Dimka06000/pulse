'use client';

import { useEffect } from 'react';
import { useEventsStore } from '@/stores/events';
import { EventSlotsBadge } from './event-slots-badge';
import { EventRegisterButton } from './event-register-button';
import { EventParticipantsList } from './event-participants-list';

interface EventDetailProps {
  eventId: string;
  viewRole: 'coach' | 'athlete';
}

function formatDateLong(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function EventDetail({ eventId, viewRole }: EventDetailProps) {
  const { selectedEvent: event, loading, error, fetchEvent } = useEventsStore();

  useEffect(() => {
    fetchEvent(eventId);
  }, [eventId]);

  if (loading || !event) {
    return <div className="animate-pulse h-96 rounded-xl bg-gray-100" />;
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  const isPast = new Date(event.date) < new Date();
  const isAthleteFull = event.filledAthlete >= event.slotsAthlete;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            event.type === 'platform'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-purple-100 text-purple-700'
          }`}>
            {event.type === 'platform' ? 'Evenement officiel' : 'Evenement partenaire'}
          </span>
          {isPast && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              Termine
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
      </div>

      {/* Info */}
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span>{'\u{1F4C5}'}</span>
          <span className="capitalize">{formatDateLong(event.date)}</span>
        </div>
        {event.address && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>{'\u{1F4CD}'}</span>
            <span>{event.address}</span>
          </div>
        )}
        {event.sport && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>{'\u{1F3C5}'}</span>
            <span className="capitalize">{event.sport}</span>
            {event.level && event.level !== 'all' && (
              <span className="text-gray-400">{'\u00B7'} {event.level}</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span>{'\u{1F4B0}'}</span>
          <span>{event.price > 0 ? `${event.price} \u20AC` : 'Gratuit'}</span>
        </div>
      </div>

      {/* Description */}
      {event.description && (
        <div className="prose prose-sm text-gray-700">
          <p>{event.description}</p>
        </div>
      )}

      {/* Slots */}
      <div className="rounded-xl border p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Places disponibles</h2>
        <div className="grid grid-cols-2 gap-4">
          <EventSlotsBadge
            filled={event.confirmedCoach}
            total={event.slotsCoach}
            label="Coachs"
          />
          <EventSlotsBadge
            filled={event.filledAthlete}
            total={event.slotsAthlete}
            label="Sportifs"
          />
        </div>
      </div>

      {/* Register CTA */}
      <EventRegisterButton
        eventId={event.id}
        userStatus={event.userStatus ?? null}
        role={viewRole}
        isFull={viewRole === 'athlete' ? isAthleteFull : false}
        isPast={isPast}
      />

      {/* Participants */}
      <EventParticipantsList eventId={event.id} />
    </div>
  );
}

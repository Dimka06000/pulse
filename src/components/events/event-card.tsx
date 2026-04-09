'use client';

import Link from 'next/link';
import type { EventWithCounts } from '@oikos/coaching';
import { EventSlotsBadge } from './event-slots-badge';

interface EventCardProps {
  event: EventWithCounts;
}

const sportEmoji: Record<string, string> = {
  boxe: '\u{1F94A}', yoga: '\u{1F9D8}', running: '\u{1F3C3}', musculation: '\u{1F4AA}', natation: '\u{1F3CA}',
  football: '\u26BD', tennis: '\u{1F3BE}', crossfit: '\u{1F525}', default: '\u{1F3C5}',
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function EventCard({ event }: EventCardProps) {
  const emoji = sportEmoji[event.sport?.toLowerCase() ?? ''] ?? sportEmoji.default;
  const isPast = new Date(event.date) < new Date();
  const isRegistered = event.userStatus && event.userStatus !== 'cancelled';

  return (
    <Link
      href={`/events/${event.id}`}
      className={`block rounded-xl border p-4 hover:shadow-md transition-shadow ${
        isPast ? 'opacity-60' : 'bg-white'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <div>
            <h3 className="font-semibold text-gray-900 line-clamp-1">{event.title}</h3>
            <p className="text-sm text-gray-500">{formatDate(event.date)}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            event.type === 'platform'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-purple-100 text-purple-700'
          }`}>
            {event.type === 'platform' ? 'Officiel' : 'Partenaire'}
          </span>
          {isRegistered && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
              Inscrit
            </span>
          )}
        </div>
      </div>

      {/* Location */}
      {event.address && (
        <p className="text-sm text-gray-600 mb-3 flex items-center gap-1">
          <span>{'\u{1F4CD}'}</span> {event.address}
        </p>
      )}

      {/* Slots */}
      <div className="grid grid-cols-2 gap-3 mb-3">
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

      {/* Price */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-500">
          {event.sport && <span className="capitalize">{event.sport}</span>}
          {event.level && event.level !== 'all' && (
            <span className="text-gray-400"> · {event.level}</span>
          )}
        </span>
        <span className="font-semibold text-gray-900">
          {event.price > 0 ? `${event.price} \u20AC` : 'Gratuit'}
        </span>
      </div>
    </Link>
  );
}

'use client';

import type { ClubEvent } from '@/stores/clubs';

interface ClubEventCardProps {
  event: ClubEvent;
  clubId: string;
  onRegister: () => void;
  onCancel: () => void;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  training: 'Entraînement',
  competition: 'Compétition',
  social: 'Social',
  workshop: 'Atelier',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  training: 'bg-brand-100 text-brand-700',
  competition: 'bg-red-100 text-red-700',
  social: 'bg-green-100 text-green-700',
  workshop: 'bg-purple-100 text-purple-700',
};

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  const day = DAYS_FR[d.getDay()];
  const date = d.getDate();
  const month = MONTHS_FR[d.getMonth()];
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${date} ${month} à ${hours}h${minutes}`;
}

export function ClubEventCard({ event, onRegister, onCancel }: ClubEventCardProps) {
  const typeLabel = EVENT_TYPE_LABELS[event.event_type] ?? event.event_type;
  const typeColor = EVENT_TYPE_COLORS[event.event_type] ?? 'bg-gray-100 text-gray-600';
  const isCancelled = event.status === 'cancelled';

  const participantText =
    event.max_participants != null
      ? `${event.participant_count ?? 0}/${event.max_participants} inscrits`
      : `${event.participant_count ?? 0} inscrits`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3">
      {/* Top row: type badge + cancelled badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColor}`}>
          {typeLabel}
        </span>
        {isCancelled && (
          <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">
            Annulé
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 leading-tight">{event.title}</h3>

      {/* Date */}
      <p className="text-sm text-gray-600">{formatEventDate(event.starts_at)}</p>

      {/* Location */}
      {event.location && (
        <p className="text-sm text-gray-500 flex items-center gap-1">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          {event.location}
        </p>
      )}

      {/* Participants */}
      <p className="text-xs text-gray-500">{participantText}</p>

      {/* RSVP button */}
      {!isCancelled && (
        event.is_registered ? (
          <button
            onClick={onCancel}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Se désinscrire
          </button>
        ) : (
          <button
            onClick={onRegister}
            className="mt-1 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            S&apos;inscrire
          </button>
        )
      )}
    </div>
  );
}

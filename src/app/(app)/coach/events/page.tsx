'use client';

import { useEffect, useState } from 'react';
import { useEventsStore } from '@/stores/events';
import { EventCard } from '@/components/events/event-card';
import { EventForm } from '@/components/events/event-form';
import { EmptyState } from '@/components/pulse/empty-state';

type Tab = 'browse' | 'my' | 'create';

export default function EventsManagePage() {
  const { events, fetchEvents, loading } = useEventsStore();
  const [tab, setTab] = useState<Tab>('browse');

  useEffect(() => {
    fetchEvents();
  }, []);

  // Filter events where current user is a coach participant
  // (userStatus is set by the API when currentUserId is provided)
  const myEvents = events.filter(
    (e) => e.userStatus && e.userStatus !== 'cancelled' && e.userStatus !== 'rejected',
  );
  const openEvents = events.filter(
    (e) => e.status === 'open' && e.confirmedCoach < e.slotsCoach,
  );

  const tabs = [
    { key: 'browse' as Tab, label: 'Postuler', count: openEvents.length },
    { key: 'my' as Tab, label: 'Mes evenements', count: myEvents.length },
    { key: 'create' as Tab, label: 'Proposer' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion evenements</h1>
        <p className="text-sm text-gray-500 mt-1">
          Postulez comme coach, gerez vos evenements confirmes, proposez des evenements partenaires
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1 text-xs text-gray-400">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'browse' && (
        <div>
          {loading && openEvents.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-52 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : openEvents.length === 0 ? (
            <EmptyState
              icon="🎪"
              title="Aucun événement disponible"
              description="Aucun événement en recherche de coachs actuellement. Revenez bientôt ou proposez le vôtre !"
              actionLabel="Proposer un événement"
              onAction={() => setTab('create')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {openEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'my' && (
        <div>
          {myEvents.length === 0 ? (
            <EmptyState
              icon="📅"
              title="Aucun événement en cours"
              description="Vous n'êtes inscrit à aucun événement pour le moment. Parcourez les événements disponibles pour postuler."
              actionLabel="Parcourir les événements"
              onAction={() => setTab('browse')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'create' && <EventForm />}
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useEventsStore } from '@/stores/events';
import { EventCard } from './event-card';

export function EventList() {
  const { events, loading, error, totalCount, filters, setFilters, fetchEvents } =
    useEventsStore();

  useEffect(() => {
    fetchEvents();
  }, []);

  if (loading && events.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-52 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
        Erreur: {error}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">Aucun evenement trouve</p>
        <p className="text-sm">Essayez de modifier vos filtres</p>
      </div>
    );
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setFilters({ page: page - 1 })}
            className="px-3 py-1 rounded border disabled:opacity-40 text-sm"
          >
            Precedent
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            Page {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setFilters({ page: page + 1 })}
            className="px-3 py-1 rounded border disabled:opacity-40 text-sm"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}

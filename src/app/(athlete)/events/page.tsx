'use client';

import { EventFilters } from '@/components/events/event-filters';
import { EventList } from '@/components/events/event-list';

export default function EventsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Evenements</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bootcamps, stages, competitions — trouvez votre prochain defi
        </p>
      </div>

      <EventFilters />
      <EventList />
    </div>
  );
}

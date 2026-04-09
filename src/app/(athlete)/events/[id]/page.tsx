'use client';

import { use } from 'react';
import { EventDetail } from '@/components/events/event-detail';

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <EventDetail eventId={id} viewRole="athlete" />
    </div>
  );
}

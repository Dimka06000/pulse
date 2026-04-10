'use client';

import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/pulse/empty-state';
import { AvailabilityManager } from './availability-manager';

type AvailabilitySlot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

// Skeleton loader
function AvailabilitySkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <div className="h-7 w-44 animate-pulse rounded-lg bg-gray-200" />
      <div className="h-4 w-72 animate-pulse rounded bg-gray-100" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
      ))}
    </div>
  );
}

export default function CoachAvailabilityPage() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/coaches/me/availability')
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then((data) => setSlots(Array.isArray(data) ? data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <AvailabilitySkeleton />;
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-text mb-6">Mes disponibilités</h1>
        <EmptyState
          icon="⚠️"
          title="Impossible de charger les disponibilités"
          description="Vérifiez votre connexion et réessayez."
          actionLabel="Réessayer"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text mb-6">
        Mes disponibilités
      </h1>
      <AvailabilityManager initialSlots={slots} />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { EmptyState } from '@/components/pulse/empty-state';
import { SessionsManager } from './sessions-manager';

type Session = {
  id: string;
  title: string;
  sport: string;
  description: string | null;
  level: string;
  type: string;
  max_participants: number;
  duration: number;
  price: number;
};

// Skeleton loader
function SessionsSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <div className="h-7 w-36 animate-pulse rounded-lg bg-gray-200" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
      ))}
    </div>
  );
}

export default function CoachSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/coaches/me/sessions')
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <SessionsSkeleton />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-text mb-6">Mes séances</h1>
        <EmptyState
          icon="⚠️"
          title="Impossible de charger les séances"
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
        Mes séances
      </h1>
      <SessionsManager initialSessions={sessions} />
    </div>
  );
}

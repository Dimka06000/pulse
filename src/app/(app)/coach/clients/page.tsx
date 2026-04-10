'use client';

import { useState, useEffect } from 'react';
import { MetricArrow } from '@/components/tracking/metric-arrow';
import { EmptyState } from '@/components/pulse/empty-state';
import { timeAgoFr } from '@/lib/format';
import { useRouter } from 'next/navigation';

interface ClientItem {
  id: string;
  name: string;
  avatarUrl?: string;
  lastSession?: string;
  totalSessions: number;
  trend: 'up' | 'down' | 'stable';
  trendSentence: string;
}

// Skeleton loader for clients list
function ClientsSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-gray-200" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4">
          <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-48 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <ClientsSkeleton />;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-text">Mes clients</h1>

      {error ? (
        <EmptyState
          icon="⚠️"
          title="Impossible de charger les clients"
          description="Vérifiez votre connexion et réessayez."
          actionLabel="Réessayer"
          onAction={() => window.location.reload()}
        />
      ) : clients.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Aucun client pour le moment"
          description="Vos clients apparaîtront ici après leur première réservation. Partagez votre profil pour attirer vos premiers sportifs !"
          actionLabel="Configurer mes séances"
          onAction={() => router.push('/coach/sessions')}
        />
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <a
              key={client.id}
              href={`/coach/clients/${client.id}`}
              className="flex items-center justify-between rounded-xl border border-border/50 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-lg font-bold text-violet-600">
                  {client.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-text">{client.name}</p>
                  <p className="text-sm text-muted">
                    {client.lastSession ? timeAgoFr(client.lastSession) : 'Jamais'} &middot; {client.totalSessions} séance{client.totalSessions > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MetricArrow direction={client.trend} />
                <span className="hidden text-sm text-muted sm:block">{client.trendSentence}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

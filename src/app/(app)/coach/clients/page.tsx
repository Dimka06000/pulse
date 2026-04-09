'use client';

import { useState, useEffect } from 'react';
import { MetricArrow } from '@/components/tracking/metric-arrow';
import { timeAgoFr } from '@/lib/format';

interface ClientItem {
  id: string;
  name: string;
  avatarUrl?: string;
  lastSession?: string;
  totalSessions: number;
  trend: 'up' | 'down' | 'stable';
  trendSentence: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Mes clients</h1>

      {clients.length === 0 ? (
        <div className="rounded-xl bg-gray-50 p-12 text-center">
          <p className="text-gray-400">Vous n&apos;avez pas encore de clients</p>
          <p className="mt-1 text-sm text-gray-300">Ils appara&icirc;tront ici après leur première réservation</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <a
              key={client.id}
              href={`/coach/clients/${client.id}`}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-600">
                  {client.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{client.name}</p>
                  <p className="text-sm text-gray-400">
                    {client.lastSession ? timeAgoFr(client.lastSession) : 'Jamais'} &middot; {client.totalSessions} séance{client.totalSessions > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MetricArrow direction={client.trend} />
                <span className="hidden text-sm text-gray-500 sm:block">{client.trendSentence}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

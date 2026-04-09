'use client';

import { useState, useEffect } from 'react';

interface RevenueData {
  totalRevenue: number;
  monthlyRevenue: number;
  pendingPayouts: number;
  completedSessions: number;
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: wire to /api/coaches/me/revenue when ready
    setData({
      totalRevenue: 0,
      monthlyRevenue: 0,
      pendingPayouts: 0,
      completedSessions: 0,
    });
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    { label: 'Revenu total', value: `${(data.totalRevenue / 100).toFixed(2)} \u20ac`, icon: '\ud83d\udcb0' },
    { label: 'Ce mois', value: `${(data.monthlyRevenue / 100).toFixed(2)} \u20ac`, icon: '\ud83d\udcc8' },
    { label: 'En attente', value: `${(data.pendingPayouts / 100).toFixed(2)} \u20ac`, icon: '\u23f3' },
    { label: 'S\u00e9ances compl\u00e9t\u00e9es', value: `${data.completedSessions}`, icon: '\u2705' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Revenus</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{card.icon}</span>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Paiements</h2>
        <p className="text-sm text-gray-400">
          Configurez votre compte Stripe dans{' '}
          <a href="/coach/stripe" className="text-blue-600 hover:underline">
            Paiements Stripe
          </a>{' '}
          pour commencer a recevoir des paiements.
        </p>
      </div>
    </div>
  );
}

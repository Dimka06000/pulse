'use client';

import { useState, useEffect } from 'react';
import { EmptyState } from '@/components/pulse/empty-state';
import { useRouter } from 'next/navigation';

interface RevenueData {
  totalRevenue: number;
  monthlyRevenue: number;
  pendingPayouts: number;
  completedSessions: number;
}

// Skeleton loader
function RevenueSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="h-7 w-32 animate-pulse rounded-lg bg-gray-200" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

export default function RevenuePage() {
  const router = useRouter();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: wire to /api/coaches/me/revenue when ready
    const timer = setTimeout(() => {
      setData({
        totalRevenue: 0,
        monthlyRevenue: 0,
        pendingPayouts: 0,
        completedSessions: 0,
      });
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <RevenueSkeleton />;
  }

  if (!data) return null;

  const hasRevenue = data.totalRevenue > 0 || data.completedSessions > 0;

  const cards = [
    { label: 'Revenu total', value: `${(data.totalRevenue / 100).toFixed(2)} \u20ac`, icon: '\ud83d\udcb0' },
    { label: 'Ce mois', value: `${(data.monthlyRevenue / 100).toFixed(2)} \u20ac`, icon: '\ud83d\udcc8' },
    { label: 'En attente', value: `${(data.pendingPayouts / 100).toFixed(2)} \u20ac`, icon: '\u23f3' },
    { label: 'S\u00e9ances compl\u00e9t\u00e9es', value: `${data.completedSessions}`, icon: '\u2705' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-text">Revenus</h1>

      {!hasRevenue ? (
        <EmptyState
          icon="💰"
          title="Aucun revenu pour le moment"
          description="Vos revenus apparaîtront ici dès que vous aurez complété votre première séance payante. Configurez Stripe pour recevoir des paiements."
          actionLabel="Configurer Stripe"
          onAction={() => router.push('/coach/stripe')}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-border/50 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{card.icon}</span>
                  <div>
                    <p className="text-sm text-muted">{card.label}</p>
                    <p className="text-xl font-bold text-text">{card.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border/50 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-sm font-medium text-muted">Paiements</h2>
            <p className="text-sm text-muted">
              Configurez votre compte Stripe dans{' '}
              <a href="/coach/stripe" className="text-brand-500 hover:underline">
                Paiements Stripe
              </a>{' '}
              pour commencer à recevoir des paiements.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

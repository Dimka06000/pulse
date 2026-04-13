'use client';

import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/pulse/app-header';
import { EmptyState } from '@/components/pulse/empty-state';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const quickLinks = [
  { href: '/coach', icon: '📊', label: 'Tableau de bord', description: 'Vue d\'ensemble' },
  { href: '/coach/agenda', icon: '📅', label: 'Agenda', description: 'Vos rendez-vous' },
  { href: '/coach/clients', icon: '👥', label: 'Mes clients', description: 'Gérer vos sportifs' },
  { href: '/coach/sessions', icon: '📋', label: 'Mes séances', description: 'Configurer vos offres' },
  { href: '/coach/programs', icon: '📝', label: 'Programmes', description: 'Vos programmes' },
  { href: '/coach/revenue', icon: '💰', label: 'Revenus', description: 'Suivre vos paiements' },
  { href: '/coach/profile', icon: '✏️', label: 'Mon profil', description: 'Modifier votre profil' },
];

interface CoachStats {
  clients: number;
  sessions: number;
  revenue: number;
  avgRating: string | null;
}

export default function CoachDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<CoachStats | null>(null);

  useEffect(() => {
    fetch('/api/coaches/me/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setStats(data); })
      .catch(() => {});
  }, []);

  const statCards = [
    { icon: '👥', label: 'Clients', value: stats ? String(stats.clients) : '—' },
    { icon: '📋', label: 'Séances', value: stats ? String(stats.sessions) : '—' },
    { icon: '💰', label: 'Revenus', value: stats ? `${(stats.revenue / 100).toFixed(0)}€` : '—' },
    { icon: '⭐', label: 'Note', value: stats?.avgRating ? `${stats.avgRating}/5` : '—' },
  ];

  return (
    <>
      <AppHeader title="Espace Coach" />
      <div className="mx-auto max-w-4xl p-4 md:p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-text">Tableau de bord</h1>
          <p className="mt-1 text-sm text-muted">
            Gérez votre activité de coaching depuis cet espace.
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border/50 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{stat.icon}</span>
                <div>
                  <p className="text-xs text-muted">{stat.label}</p>
                  <p className="text-xl font-bold text-text">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick links grid */}
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted">
            Accès rapide
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="text-2xl">{link.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-text">{link.label}</p>
                  <p className="text-xs text-muted">{link.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Getting started hint — only when no sessions yet */}
        {stats && stats.sessions === 0 && (
          <EmptyState
            icon="🚀"
            title="Commencez par configurer vos séances"
            description="Créez vos offres de coaching, définissez vos disponibilités, et les sportifs pourront vous réserver directement."
            actionLabel="Créer une séance"
            onAction={() => router.push('/coach/sessions')}
          />
        )}
      </div>
    </>
  );
}

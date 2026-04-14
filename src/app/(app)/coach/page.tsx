'use client';

import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/pulse/app-header';
import { EmptyState } from '@/components/pulse/empty-state';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CoachStats {
  clients: number;
  sessions: number;
  revenue: number;
  avgRating: string | null;
}

const quickLinks = [
  { href: '/coach/agenda', icon: '📅', label: 'Agenda', description: 'Vos rendez-vous', bg: 'bg-blue-50' },
  { href: '/coach/clients', icon: '👥', label: 'Mes clients', description: 'Gerer vos sportifs', bg: 'bg-purple-50' },
  { href: '/coach/sessions', icon: '📋', label: 'Mes seances', description: 'Configurer vos offres', bg: 'bg-emerald-50' },
  { href: '/coach/programs', icon: '📝', label: 'Programmes', description: 'Vos programmes', bg: 'bg-orange-50' },
  { href: '/coach/revenue', icon: '💰', label: 'Revenus', description: 'Suivre vos paiements', bg: 'bg-yellow-50' },
  { href: '/coach/profile', icon: '✏️', label: 'Mon profil', description: 'Modifier votre profil', bg: 'bg-gray-50' },
];

const accentColor = '#6366f1';

export default function CoachDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<CoachStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/coaches/me/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setStats(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Current date French
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  const statsCards = [
    {
      label: 'Clients actifs',
      value: loading ? '—' : String(stats?.clients ?? 0),
      icon: '👥',
      bg: 'bg-purple-50',
    },
    {
      label: 'Seances total',
      value: loading ? '—' : String(stats?.sessions ?? 0),
      icon: '📋',
      bg: 'bg-blue-50',
    },
    {
      label: 'Revenus cumules',
      value: loading ? '—' : (stats ? `${(stats.revenue / 100).toFixed(0)} €` : '—'),
      icon: '💰',
      bg: 'bg-yellow-50',
    },
    {
      label: 'Note moyenne',
      value: loading ? '—' : (stats?.avgRating ? `${stats.avgRating}/5` : '—'),
      icon: '⭐',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <>
      <AppHeader title="Espace Coach" />

      <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto pb-24">

        {/* ── GREETING ── */}
        <div className="pt-1">
          <h1 className="text-2xl font-extrabold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-400 mt-0.5">{todayCapitalized}</p>
          <p className="text-sm text-gray-500 mt-1">Gerez votre activite de coaching depuis cet espace.</p>
        </div>

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-2 gap-3">
          {statsCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${card.bg}`}>
                  {card.icon}
                </span>
                <div>
                  <p className="text-[11px] text-gray-400 font-medium leading-tight">{card.label}</p>
                  <p className="text-xl font-extrabold text-gray-900 font-mono">{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── ACTIONS RAPIDES ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">Actions rapides</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/coach/sessions')}
              className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xl">➕</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Nouvelle seance</p>
                <p className="text-xs text-gray-400">Creer une offre</p>
              </div>
            </button>

            <button
              onClick={() => router.push('/coach/programs')}
              className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl">📋</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Nouveau programme</p>
                <p className="text-xs text-gray-400">Plan d'entrainement</p>
              </div>
            </button>

            <button
              onClick={() => router.push('/coach/availability')}
              className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">🗓️</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Disponibilites</p>
                <p className="text-xs text-gray-400">Gerer mon agenda</p>
              </div>
            </button>

            <button
              onClick={() => router.push('/coach/clients')}
              className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-xl">👥</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Voir clients</p>
                <p className="text-xs text-gray-400">{stats ? `${stats.clients} sportif${stats.clients > 1 ? 's' : ''}` : 'Mes sportifs'}</p>
              </div>
            </button>
          </div>
        </div>

        {/* ── NAVIGATION COMPLETE ── */}
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-3">Navigation</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${link.bg}`}>
                  {link.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{link.label}</p>
                  <p className="text-xs text-gray-400">{link.description}</p>
                </div>
                <span className="ml-auto text-gray-300 text-sm">›</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── GETTING STARTED — only when no sessions yet ── */}
        {!loading && stats && stats.sessions === 0 && (
          <EmptyState
            icon="🚀"
            title="Commencez par configurer vos seances"
            description="Creez vos offres de coaching, definissez vos disponibilites, et les sportifs pourront vous reserver directement."
            actionLabel="Creer une seance"
            onAction={() => router.push('/coach/sessions')}
          />
        )}

        {/* bottom accent line */}
        <div className="h-1 w-16 rounded-full mx-auto" style={{ background: accentColor, opacity: 0.3 }} />
      </div>
    </>
  );
}

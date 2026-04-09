'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/admin/stat-card';
import { DataTable, type Column } from '@/components/admin/data-table';

type Stats = {
  totalCoaches: number;
  totalAthletes: number;
  totalBookings: number;
  totalRevenue: number;
  recentBookings: Record<string, unknown>[];
};

const recentColumns: Column<Record<string, unknown>>[] = [
  {
    key: 'athlete',
    header: 'Athlète',
    render: (item) => {
      const a = item.athlete as Record<string, string> | null;
      return a ? `${a.first_name} ${a.last_name}` : '—';
    },
  },
  {
    key: 'coach',
    header: 'Coach',
    render: (item) => {
      const cp = item.coach_profile as Record<string, unknown> | null;
      const p = cp?.profile as Record<string, string> | null;
      return p ? `${p.first_name} ${p.last_name}` : '—';
    },
  },
  {
    key: 'start_time',
    header: 'Date',
    render: (item) =>
      item.start_time
        ? new Date(item.start_time as string).toLocaleDateString('fr-FR')
        : '—',
  },
  {
    key: 'status',
    header: 'Statut',
    render: (item) => (
      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
        {String(item.status)}
      </span>
    ),
  },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setStats(data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-500">Erreur de chargement des statistiques</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold font-display">Tableau de bord</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Coachs" value={stats.totalCoaches} />
        <StatCard label="Athlètes" value={stats.totalAthletes} />
        <StatCard label="Réservations" value={stats.totalBookings} />
        <StatCard
          label="Revenus"
          value={`${(stats.totalRevenue / 100).toFixed(2)} EUR`}
        />
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold font-display">
          Dernières réservations
        </h2>
        <DataTable
          columns={recentColumns}
          data={stats.recentBookings}
          emptyMessage="Aucune réservation récente"
        />
      </div>
    </div>
  );
}

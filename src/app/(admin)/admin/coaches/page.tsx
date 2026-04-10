'use client';

import { useEffect, useState, useCallback } from 'react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Coach = Record<string, unknown> & {
  id: string;
  specialties: string[] | null;
  hourly_rate: number | null;
  avg_rating: number | null;
  total_sessions: number | null;
  is_verified: boolean;
  profile: { first_name: string; last_name: string; email: string } | null;
};

export default function AdminCoaches() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    fetch(`/api/admin/coaches${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.coaches) setCoaches(data.coaches);
      })
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleVerify(coach: Coach) {
    await fetch(`/api/admin/coaches/${coach.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_verified: !coach.is_verified }),
    });
    load();
  }

  const columns: Column<Coach>[] = [
    {
      key: 'name',
      header: 'Nom',
      render: (c) =>
        c.profile
          ? `${c.profile.first_name} ${c.profile.last_name}`
          : '—',
    },
    {
      key: 'email',
      header: 'Email',
      render: (c) => c.profile?.email ?? '—',
    },
    {
      key: 'specialties',
      header: 'Spécialités',
      render: (c) =>
        (c.specialties ?? []).length > 0
          ? (c.specialties as string[]).join(', ')
          : '—',
    },
    {
      key: 'hourly_rate',
      header: 'Tarif',
      render: (c) => (c.hourly_rate != null ? `${c.hourly_rate} EUR/h` : '—'),
    },
    {
      key: 'avg_rating',
      header: 'Note',
      render: (c) =>
        c.avg_rating != null ? `${Number(c.avg_rating).toFixed(1)} / 5` : '—',
    },
    {
      key: 'total_sessions',
      header: 'Sessions',
      render: (c) => String(c.total_sessions ?? 0),
    },
    {
      key: 'is_verified',
      header: 'Vérifié',
      render: (c) => (
        <Badge variant={c.is_verified ? 'success' : 'warning'}>
          {c.is_verified ? 'Oui' : 'Non'}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (c) => (
        <Button
          size="sm"
          variant={c.is_verified ? 'ghost' : 'primary'}
          onClick={() => toggleVerify(c)}
        >
          {c.is_verified ? 'Retirer' : 'Vérifier'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold font-display">Gestion des coachs</h1>

      <div className="max-w-sm">
        <input
          type="text"
          placeholder="Rechercher un coach..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={coaches}
            emptyMessage="Aucun coach trouvé"
          />
        )}
      </div>
    </div>
  );
}

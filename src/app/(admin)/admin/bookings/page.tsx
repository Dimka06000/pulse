'use client';

import { useEffect, useState, useCallback } from 'react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';

type Booking = Record<string, unknown> & {
  id: string;
  start_time: string;
  status: string;
  session_template: { title: string } | null;
  athlete: { first_name: string; last_name: string } | null;
  coach_profile: {
    profile: { first_name: string; last_name: string } | null;
  } | null;
};

const STATUS_OPTIONS = ['', 'pending', 'confirmed', 'completed', 'cancelled'];

const statusVariant: Record<string, 'default' | 'success' | 'warning'> = {
  pending: 'warning',
  confirmed: 'default',
  completed: 'success',
  cancelled: 'default',
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (statusFilter) params.set('status', statusFilter);

    fetch(`/api/admin/bookings?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.bookings) {
          setBookings(data.bookings);
          setTotal(data.total);
        }
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / limit);

  const columns: Column<Booking>[] = [
    {
      key: 'athlete',
      header: 'Athlète',
      render: (b) =>
        b.athlete
          ? `${b.athlete.first_name} ${b.athlete.last_name}`
          : '—',
    },
    {
      key: 'coach',
      header: 'Coach',
      render: (b) => {
        const p = b.coach_profile?.profile;
        return p ? `${p.first_name} ${p.last_name}` : '—';
      },
    },
    {
      key: 'session',
      header: 'Séance',
      render: (b) => b.session_template?.title ?? '—',
    },
    {
      key: 'start_time',
      header: 'Date',
      render: (b) =>
        b.start_time
          ? new Date(b.start_time).toLocaleDateString('fr-FR')
          : '—',
    },
    {
      key: 'status',
      header: 'Statut',
      render: (b) => (
        <Badge variant={statusVariant[b.status] ?? 'default'}>
          {b.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold font-display">Réservations</h1>

      <div className="max-w-xs">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Tous les statuts</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
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
            data={bookings}
            emptyMessage="Aucune réservation"
          />
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="text-sm text-gray-500">
            Page {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';

type Payment = Record<string, unknown> & {
  id: string;
  amount_cents: number;
  status: string;
  stripe_payment_intent_id: string | null;
  created_at: string;
  profile: { first_name: string; last_name: string; email: string } | null;
};

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/payments?page=${page}&limit=${limit}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.payments) {
          setPayments(data.payments);
          setTotal(data.total);
        }
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / limit);

  const columns: Column<Payment>[] = [
    {
      key: 'user',
      header: 'Utilisateur',
      render: (p) =>
        p.profile
          ? `${p.profile.first_name} ${p.profile.last_name}`
          : '—',
    },
    {
      key: 'email',
      header: 'Email',
      render: (p) => p.profile?.email ?? '—',
    },
    {
      key: 'amount_cents',
      header: 'Montant',
      render: (p) => `${(p.amount_cents / 100).toFixed(2)} EUR`,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (p) => (
        <Badge variant={p.status === 'succeeded' ? 'success' : 'warning'}>
          {p.status}
        </Badge>
      ),
    },
    {
      key: 'stripe_payment_intent_id',
      header: 'Stripe ID',
      render: (p) =>
        p.stripe_payment_intent_id ? (
          <code className="text-xs text-gray-500">
            {p.stripe_payment_intent_id.slice(0, 20)}...
          </code>
        ) : (
          '—'
        ),
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (p) =>
        p.created_at
          ? new Date(p.created_at).toLocaleDateString('fr-FR')
          : '—',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold font-display">Paiements</h1>

      <div className="rounded-xl border bg-white shadow-sm">
        {loading ? (
          <p className="py-8 text-center text-gray-400">Chargement...</p>
        ) : (
          <DataTable
            columns={columns}
            data={payments}
            emptyMessage="Aucun paiement"
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

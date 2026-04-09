'use client';

import { useEffect, useState, useCallback } from 'react';
import { DataTable, type Column } from '@/components/admin/data-table';
import { Button } from '@/components/ui/button';

type Rating = Record<string, unknown> & {
  id: string;
  score: number;
  comment: string | null;
  coach_reply: string | null;
  is_anonymous: boolean;
  created_at: string;
  booking: {
    start_time: string;
    athlete: { first_name: string; last_name: string } | null;
    coach_profile: {
      profile: { first_name: string; last_name: string } | null;
    } | null;
  } | null;
};

function Stars({ score }: { score: number }) {
  return (
    <span className="text-amber-500">
      {'★'.repeat(score)}
      {'☆'.repeat(5 - score)}
    </span>
  );
}

export default function AdminRatings() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/ratings')
      .then((r) => r.json())
      .then((data) => {
        if (data.ratings) setRatings(data.ratings);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function deleteRating(id: string) {
    if (!confirm('Supprimer cet avis ? Cette action est irréversible.')) return;

    await fetch('/api/admin/ratings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  }

  const columns: Column<Rating>[] = [
    {
      key: 'athlete',
      header: 'Athlète',
      render: (r) => {
        const a = r.booking?.athlete;
        if (r.is_anonymous) return 'Anonyme';
        return a ? `${a.first_name} ${a.last_name}` : '—';
      },
    },
    {
      key: 'coach',
      header: 'Coach',
      render: (r) => {
        const p = r.booking?.coach_profile?.profile;
        return p ? `${p.first_name} ${p.last_name}` : '—';
      },
    },
    {
      key: 'score',
      header: 'Note',
      render: (r) => <Stars score={r.score} />,
    },
    {
      key: 'comment',
      header: 'Commentaire',
      render: (r) =>
        r.comment ? (
          <span className="line-clamp-2 max-w-xs" title={r.comment}>
            {r.comment}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (r) =>
        r.created_at
          ? new Date(r.created_at).toLocaleDateString('fr-FR')
          : '—',
    },
    {
      key: 'action',
      header: 'Action',
      render: (r) => (
        <Button size="sm" variant="ghost" onClick={() => deleteRating(r.id)}>
          Supprimer
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold font-display">Modération des avis</h1>

      <div className="rounded-xl border bg-white shadow-sm">
        {loading ? (
          <p className="py-8 text-center text-gray-400">Chargement...</p>
        ) : (
          <DataTable
            columns={columns}
            data={ratings}
            emptyMessage="Aucun avis"
          />
        )}
      </div>
    </div>
  );
}

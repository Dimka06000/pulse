'use client';

import { useEffect, useState } from 'react';

interface Participant {
  id: string;
  user_id: string;
  role: 'coach' | 'athlete';
  status: string;
  profiles: { id: string; display_name: string; avatar_url: string | null };
}

export function EventParticipantsList({ eventId }: { eventId: string }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/events/${eventId}/participants`)
      .then((res) => res.json())
      .then((data) => {
        setParticipants(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [eventId]);

  if (loading) return <div className="h-20 bg-gray-50 rounded-xl animate-pulse" />;
  if (participants.length === 0) return null;

  const coaches = participants.filter((p) => p.role === 'coach' && p.status !== 'cancelled');
  const athletes = participants.filter((p) => p.role === 'athlete' && p.status !== 'cancelled');

  const statusLabel: Record<string, string> = {
    applied: 'En attente',
    confirmed: 'Confirme',
    rejected: 'Refuse',
  };

  const statusColor: Record<string, string> = {
    applied: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
  };

  const renderRow = (p: Participant) => (
    <div key={p.id} className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
          {p.profiles?.display_name?.charAt(0)?.toUpperCase() ?? '?'}
        </div>
        <span className="text-sm">{p.profiles?.display_name ?? 'Utilisateur'}</span>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
        {statusLabel[p.status] ?? p.status}
      </span>
    </div>
  );

  return (
    <div className="rounded-xl border p-4 space-y-4">
      {coaches.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Coachs ({coaches.length})
          </h3>
          <div className="divide-y">{coaches.map(renderRow)}</div>
        </div>
      )}
      {athletes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Sportifs ({athletes.length})
          </h3>
          <div className="divide-y">{athletes.map(renderRow)}</div>
        </div>
      )}
    </div>
  );
}

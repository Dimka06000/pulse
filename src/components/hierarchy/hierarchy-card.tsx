'use client';

import { useSocialStore } from '@/stores/social';
import { useState } from 'react';

interface HierarchyCardProps {
  id: string;
  name: string;
  mode: string;
  commissionSplit: number;
  status: string;
  role: 'senior' | 'junior';  // am I senior or junior in this relation?
  seniorApprovalRequired: boolean;
}

const MODE_LABELS: Record<string, string> = {
  team: 'Équipe',
  cabinet: 'Cabinet',
  mentorship: 'Mentorat',
  mixed: 'Mixte',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  ended: 'bg-gray-100 text-gray-500',
};

export function HierarchyCard({
  id,
  name,
  mode,
  commissionSplit,
  status,
  role,
  seniorApprovalRequired,
}: HierarchyCardProps) {
  const { updateHierarchy } = useSocialStore();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await updateHierarchy(id, { status: 'active' });
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!confirm('Mettre fin à cette relation ?')) return;
    setLoading(true);
    try {
      await updateHierarchy(id, { status: 'ended' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900">{name}</p>
          <p className="text-sm text-gray-500">
            {role === 'senior' ? 'Votre junior' : 'Votre senior'} · {MODE_LABELS[mode] ?? mode}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? ''}`}>
          {status === 'pending' ? 'En attente' : status === 'active' ? 'Actif' : 'Terminé'}
        </span>
      </div>

      <div className="mt-3 flex gap-4 text-sm text-gray-600">
        <span>Commission : {commissionSplit}%</span>
        {seniorApprovalRequired && <span>Approbation requise</span>}
      </div>

      {status === 'pending' && role === 'junior' && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 rounded-lg bg-green-600 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          >
            Accepter
          </button>
          <button
            onClick={handleEnd}
            disabled={loading}
            className="flex-1 rounded-lg border border-red-300 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Refuser
          </button>
        </div>
      )}

      {status === 'active' && (
        <button
          onClick={handleEnd}
          disabled={loading}
          className="mt-3 text-sm text-red-600 hover:underline"
        >
          Mettre fin
        </button>
      )}
    </div>
  );
}

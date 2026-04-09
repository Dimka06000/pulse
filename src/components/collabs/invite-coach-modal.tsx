'use client';

import { useState } from 'react';
import { useSocialStore } from '@/stores/social';

interface InviteCoachModalProps {
  collabId: string;
  onClose: () => void;
}

export function InviteCoachModal({ collabId, onClose }: InviteCoachModalProps) {
  const { inviteToCollab } = useSocialStore();
  const [coachId, setCoachId] = useState('');
  const [revenueShare, setRevenueShare] = useState(30);
  const [role, setRole] = useState<'lead' | 'participant'>('participant');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await inviteToCollab(collabId, { coachId, role, revenueShare });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-lg font-semibold">Inviter un coach</h3>

          <div>
            <label className="text-sm font-medium text-gray-700">ID du coach</label>
            <input
              type="text"
              value={coachId}
              onChange={(e) => setCoachId(e.target.value)}
              placeholder="ID du profil coach"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Rôle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'lead' | 'participant')}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="participant">Participant</option>
              <option value="lead">Co-lead</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Part des revenus : {revenueShare}%
            </label>
            <input
              type="range"
              min={5}
              max={80}
              step={5}
              value={revenueShare}
              onChange={(e) => setRevenueShare(Number(e.target.value))}
              className="mt-1 w-full"
            />
            <p className="text-xs text-gray-500">
              Votre part sera ajustée automatiquement
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !coachId}
              className="flex-1 rounded-lg bg-brand-600 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? 'Envoi...' : 'Inviter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

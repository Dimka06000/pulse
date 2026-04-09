'use client';

import { useState } from 'react';
import { useSocialStore } from '@/stores/social';

const MODES = [
  { value: 'team', label: 'Équipe', desc: 'Vous travaillez ensemble' },
  { value: 'cabinet', label: 'Cabinet', desc: 'Partage de clientèle' },
  { value: 'mentorship', label: 'Mentorat', desc: 'Vous formez ce coach' },
  { value: 'mixed', label: 'Mixte', desc: 'Combinaison libre' },
];

export function InviteJuniorForm({ onClose }: { onClose: () => void }) {
  const { inviteJunior } = useSocialStore();
  const [coachId, setCoachId] = useState('');
  const [mode, setMode] = useState('team');
  const [commission, setCommission] = useState(10);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await inviteJunior({
        juniorCoachId: coachId,
        mode,
        commissionSplit: commission,
        seniorApprovalRequired: approvalRequired,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">Inviter un coach junior</h3>

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
        <label className="text-sm font-medium text-gray-700">Mode</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                mode === m.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{m.label}</div>
              <div className="text-xs text-gray-500">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">
          Commission : {commission}%
        </label>
        <input
          type="range"
          min={0}
          max={50}
          step={1}
          value={commission}
          onChange={(e) => setCommission(Number(e.target.value))}
          className="mt-1 w-full"
        />
        <p className="text-xs text-gray-500">
          Vous recevrez {commission}% sur chaque session du junior
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={approvalRequired}
          onChange={(e) => setApprovalRequired(e.target.checked)}
          className="rounded"
        />
        Approbation requise pour les sessions du junior
      </label>

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
  );
}

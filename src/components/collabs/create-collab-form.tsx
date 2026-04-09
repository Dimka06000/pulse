'use client';

import { useState } from 'react';
import { useSocialStore } from '@/stores/social';

const TYPES = [
  { value: 'joint_session', label: 'Session commune', desc: 'Deux coachs, une session' },
  { value: 'program', label: 'Programme', desc: 'Programme multi-semaines' },
  { value: 'guest', label: 'Invité', desc: 'Coach invité ponctuellement' },
];

export function CreateCollabForm({ onClose }: { onClose: () => void }) {
  const { createCollab } = useSocialStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('joint_session');
  const [durationWeeks, setDurationWeeks] = useState<number | undefined>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createCollab({ name, description, type, durationWeeks });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">Nouvelle collaboration</h3>

      <div>
        <label className="text-sm font-medium text-gray-700">Nom</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Bootcamp été 2026"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Type</label>
        <div className="mt-2 space-y-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                type === t.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{t.label}</div>
              <div className="text-xs text-gray-500">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {type === 'program' && (
        <div>
          <label className="text-sm font-medium text-gray-700">Durée (semaines)</label>
          <input
            type="number"
            value={durationWeeks ?? ''}
            onChange={(e) => setDurationWeeks(e.target.value ? Number(e.target.value) : undefined)}
            min={1}
            max={52}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[60px] resize-y"
          placeholder="Décrivez la collaboration..."
        />
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
          disabled={loading || !name}
          className="flex-1 rounded-lg bg-brand-600 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Création...' : 'Créer'}
        </button>
      </div>
    </form>
  );
}

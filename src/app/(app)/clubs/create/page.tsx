'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

const SPORTS = [
  'Running',
  'CrossFit',
  'Musculation',
  'Yoga',
  'Natation',
  'Cyclisme',
  'Trail',
  'Arts martiaux',
  'Danse',
  'Football',
];

const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé', 'Tous niveaux'];

const JOIN_MODES = [
  { value: 'open', label: 'Ouvert' },
  { value: 'approval', label: 'Sur validation' },
  { value: 'invite', label: 'Sur invitation' },
];

export default function CreateClubPage() {
  const router = useRouter();
  const { userRole } = useAuthStore();

  const [form, setForm] = useState({
    name: '',
    description: '',
    sports: [] as string[],
    levels: [] as string[],
    join_mode: 'open',
    address: '',
    city: '',
    postal_code: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userRole !== 'coach' && userRole !== 'both') {
      router.replace('/clubs');
    }
  }, [userRole, router]);

  function toggleArray(field: 'sports' | 'levels', value: string) {
    setForm((prev) => {
      const arr = prev[field];
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur lors de la création du club');
      router.push(`/clubs/${json.slug}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (userRole !== 'coach' && userRole !== 'both') return null;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-text">Créer un club</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">
            Nom du club <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Ex : CrossFit Bordeaux"
            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Décrivez votre club, son ambiance, ses objectifs..."
            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
          />
        </div>

        {/* Sports */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text">Sports pratiqués</label>
          <div className="flex flex-wrap gap-2">
            {SPORTS.map((sport) => (
              <button
                key={sport}
                type="button"
                onClick={() => toggleArray('sports', sport)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  form.sports.includes(sport)
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-brand-400'
                }`}
              >
                {sport}
              </button>
            ))}
          </div>
        </div>

        {/* Levels */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text">Niveaux acceptés</label>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => toggleArray('levels', level)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  form.levels.includes(level)
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-brand-400'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Join mode */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Mode d'adhésion</label>
          <select
            value={form.join_mode}
            onChange={(e) => setForm((prev) => ({ ...prev, join_mode: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            {JOIN_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Address */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Adresse</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            placeholder="12 rue des Acacias"
            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* City + Postal code */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-text">Ville</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              placeholder="Paris"
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div className="w-36">
            <label className="mb-1.5 block text-sm font-medium text-text">Code postal</label>
            <input
              type="text"
              value={form.postal_code}
              onChange={(e) => setForm((prev) => ({ ...prev, postal_code: e.target.value }))}
              placeholder="75001"
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting || !form.name.trim()}
            className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Création...' : 'Créer le club'}
          </button>
        </div>
      </form>
    </div>
  );
}

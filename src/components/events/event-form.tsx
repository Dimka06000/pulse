'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface EventFormProps {
  initialData?: {
    id?: string;
    title?: string;
    description?: string;
    type?: 'platform' | 'partner';
    date?: string;
    address?: string;
    slotsCoach?: number;
    slotsAthlete?: number;
    price?: number;
    sport?: string;
    level?: string;
  };
}

const SPORTS = [
  'Boxe', 'Yoga', 'Running', 'Musculation', 'Natation',
  'Football', 'Tennis', 'CrossFit', 'Danse', 'Pilates',
];

export function EventForm({ initialData }: EventFormProps) {
  const router = useRouter();
  const isEdit = !!initialData?.id;

  const [form, setForm] = useState({
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    type: initialData?.type ?? 'partner' as const,
    date: initialData?.date ?? '',
    address: initialData?.address ?? '',
    slotsCoach: initialData?.slotsCoach ?? 2,
    slotsAthlete: initialData?.slotsAthlete ?? 20,
    price: initialData?.price ?? 0,
    sport: initialData?.sport ?? '',
    level: initialData?.level ?? 'all',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const url = isEdit ? `/api/events/${initialData!.id}` : '/api/events';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          sport: form.sport || null,
          price: Number(form.price),
          slotsCoach: Number(form.slotsCoach),
          slotsAthlete: Number(form.slotsAthlete),
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Erreur');
      }

      const data = await res.json();
      router.push(isEdit ? `/events/${initialData!.id}` : `/events/${data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
      <h2 className="text-xl font-bold">
        {isEdit ? "Modifier l'evenement" : 'Proposer un evenement'}
      </h2>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
        <input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="Bootcamp Boxing Paris"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          rows={3}
          placeholder="Decrivez l'evenement..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as any })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="partner">Partenaire</option>
            <option value="platform">Officiel (plateforme)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sport</label>
          <select
            value={form.sport}
            onChange={(e) => setForm({ ...form, sport: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Non specifie</option>
            {SPORTS.map((s) => (
              <option key={s} value={s.toLowerCase()}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date et heure</label>
        <input
          required
          type="datetime-local"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
        <input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="12 Rue du Sport, Paris"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Places coach</label>
          <input
            type="number"
            min={1}
            max={50}
            value={form.slotsCoach}
            onChange={(e) => setForm({ ...form, slotsCoach: Number(e.target.value) })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Places sportif</label>
          <input
            type="number"
            min={1}
            max={500}
            value={form.slotsAthlete}
            onChange={(e) => setForm({ ...form, slotsAthlete: Number(e.target.value) })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prix (EUR)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
        <select
          value={form.level}
          onChange={(e) => setForm({ ...form, level: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">Tous niveaux</option>
          <option value="beginner">Debutant</option>
          <option value="intermediate">Intermediaire</option>
          <option value="advanced">Avance</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {submitting
          ? 'Envoi...'
          : isEdit
            ? 'Enregistrer'
            : 'Creer l\'evenement'}
      </button>
    </form>
  );
}

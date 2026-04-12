'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ClubData {
  id: string;
  name: string;
  description: string;
  sports: string[];
  levels: string[];
  join_mode: 'open' | 'approval' | 'invite';
  address: string | null;
  city: string | null;
  postal_code: string | null;
  logo_url: string | null;
  banner_url: string | null;
}

const LEVELS_OPTIONS = ['beginner', 'intermediate', 'advanced', 'elite'];
const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
  elite: 'Élite',
};

export default function ManageSettingsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [clubId, setClubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    sports: '',
    levels: [] as string[],
    join_mode: 'open' as 'open' | 'approval' | 'invite',
    address: '',
    city: '',
    postal_code: '',
    logo_url: '',
    banner_url: '',
  });

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/clubs/${slug}?by=slug`)
      .then((r) => r.json())
      .then((json: ClubData & { error?: string }) => {
        if (!json.id) { setError('Club introuvable'); return; }
        setClubId(json.id);
        setForm({
          name: json.name ?? '',
          description: json.description ?? '',
          sports: (json.sports ?? []).join(', '),
          levels: json.levels ?? [],
          join_mode: json.join_mode ?? 'open',
          address: json.address ?? '',
          city: json.city ?? '',
          postal_code: json.postal_code ?? '',
          logo_url: json.logo_url ?? '',
          banner_url: json.banner_url ?? '',
        });
      })
      .catch(() => setError('Erreur chargement club'))
      .finally(() => setLoading(false));
  }, [slug]);

  const toggleLevel = (level: string) => {
    setForm((f) => ({
      ...f,
      levels: f.levels.includes(level)
        ? f.levels.filter((l) => l !== level)
        : [...f.levels, level],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId) return;
    setSaveError(null);
    setSaveSuccess(false);

    if (!form.name.trim()) { setSaveError('Le nom est requis.'); return; }

    setSaving(true);
    try {
      const sports = form.sports
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const body: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        sports,
        levels: form.levels,
        join_mode: form.join_mode,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        postal_code: form.postal_code.trim() || null,
        logo_url: form.logo_url.trim() || null,
        banner_url: form.banner_url.trim() || null,
      };

      const res = await fetch(`/api/clubs/${clubId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur lors de la sauvegarde');
      setSaveSuccess(true);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6 space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-64 rounded-xl bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres du club</h1>
        <Link href={`/clubs/${slug}/manage`} className="text-sm text-brand-600 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 space-y-6 shadow-sm">
        {saveError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</div>
        )}
        {saveSuccess && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">Paramètres sauvegardés !</div>
        )}

        {/* General */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Général</legend>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du club *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Présentez votre club en quelques mots..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sports <span className="text-gray-400 font-normal">(séparés par des virgules)</span>
            </label>
            <input
              type="text"
              value={form.sports}
              onChange={(e) => setForm((f) => ({ ...f, sports: e.target.value }))}
              placeholder="Football, Natation, Athlétisme..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Niveaux acceptés</label>
            <div className="flex flex-wrap gap-2">
              {LEVELS_OPTIONS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggleLevel(level)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    form.levels.includes(level)
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
                  }`}
                >
                  {LEVEL_LABELS[level]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Accès au club</label>
            <select
              value={form.join_mode}
              onChange={(e) => setForm((f) => ({ ...f, join_mode: e.target.value as any }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="open">Ouvert — tout le monde peut rejoindre</option>
              <option value="approval">Sur validation — les demandes sont examinées</option>
              <option value="invite">Sur invitation uniquement</option>
            </select>
          </div>
        </fieldset>

        {/* Location */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Localisation</legend>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="1 rue de la Paix"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="Paris"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
              <input
                type="text"
                value={form.postal_code}
                onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
                placeholder="75001"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </fieldset>

        {/* Branding */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Images</legend>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL du logo</label>
            <input
              type="url"
              value={form.logo_url}
              onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
              placeholder="https://..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL de la bannière</label>
            <input
              type="url"
              value={form.banner_url}
              onChange={(e) => setForm((f) => ({ ...f, banner_url: e.target.value }))}
              placeholder="https://..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-brand-500 py-3 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Sauvegarde en cours...' : 'Sauvegarder les paramètres'}
        </button>
      </form>

      {/* Danger zone */}
      <section className="rounded-xl border border-red-200 bg-red-50 p-5">
        <h3 className="text-sm font-semibold text-red-700 mb-2">Zone dangereuse</h3>
        <p className="text-xs text-red-600 mb-3">Ces actions sont irréversibles. Procédez avec précaution.</p>
        <Link
          href={`/clubs/${slug}/manage/stripe`}
          className="inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:underline"
        >
          Configurer les paiements Stripe →
        </Link>
      </section>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  interval: string;
  includes_coaching: boolean;
  max_sessions_per_month: number | null;
  is_active: boolean;
  stripe_price_id: string | null;
}

const INTERVAL_LABELS: Record<string, string> = {
  month: 'Mensuel',
  year: 'Annuel',
  one_time: 'Accès unique',
};

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

const defaultForm = {
  name: '',
  description: '',
  price: '',
  interval: 'month',
  includes_coaching: false,
  max_sessions_per_month: '',
};

export default function ManagePlansPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [clubId, setClubId] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/clubs/${slug}?by=slug`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.id) { setError('Club introuvable'); return; }
        setClubId(json.id);
      })
      .catch(() => setError('Erreur chargement club'));
  }, [slug]);

  const loadPlans = () => {
    if (!clubId) return;
    setLoading(true);
    fetch(`/api/clubs/${clubId}/plans?all=true`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPlans(); }, [clubId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId) return;
    setFormError(null);
    setFormSuccess(false);

    if (!form.name.trim()) { setFormError('Le nom est requis.'); return; }
    const priceNum = parseFloat(form.price.replace(',', '.'));
    if (isNaN(priceNum) || priceNum < 0) { setFormError('Prix invalide.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          price_cents: Math.round(priceNum * 100),
          interval: form.interval,
          includes_coaching: form.includes_coaching,
          max_sessions_per_month: form.max_sessions_per_month
            ? parseInt(form.max_sessions_per_month, 10)
            : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur lors de la création');
      setForm(defaultForm);
      setFormSuccess(true);
      loadPlans();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (plan: Plan) => {
    if (!clubId) return;
    setToggling((prev) => ({ ...prev, [plan.id]: true }));
    try {
      await fetch(`/api/clubs/${clubId}/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !plan.is_active }),
      });
      loadPlans();
    } finally {
      setToggling((prev) => ({ ...prev, [plan.id]: false }));
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Formules d'abonnement</h1>
        <Link href={`/clubs/${slug}/manage`} className="text-sm text-brand-600 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Create plan form */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-700">Créer une formule</h2>
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
          )}
          {formSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">Formule créée avec succès !</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Name */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Formule Mensuelle, Pass Annuel..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Décrivez ce qui est inclus..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix (€)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0,00"
                  className="w-full rounded-lg border border-gray-300 pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <span className="absolute right-3 top-2 text-sm text-gray-400">€</span>
              </div>
            </div>

            {/* Interval */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence</label>
              <select
                value={form.interval}
                onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="month">Mensuel</option>
                <option value="year">Annuel</option>
                <option value="one_time">Accès unique</option>
              </select>
            </div>

            {/* Max sessions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Séances max / mois</label>
              <input
                type="number"
                min="1"
                value={form.max_sessions_per_month}
                onChange={(e) => setForm((f) => ({ ...f, max_sessions_per_month: e.target.value }))}
                placeholder="Illimité si vide"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Includes coaching */}
            <div className="flex items-center gap-3">
              <input
                id="includes-coaching"
                type="checkbox"
                checked={form.includes_coaching}
                onChange={(e) => setForm((f) => ({ ...f, includes_coaching: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="includes-coaching" className="text-sm font-medium text-gray-700">
                Inclut le coaching personnalisé
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-500 py-3 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Création en cours...' : 'Créer la formule'}
          </button>
        </form>
      </section>

      {/* Plans list */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-700">
          Formules existantes {!loading && `(${plans.length})`}
        </h2>
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[0, 1].map((i) => <div key={i} className="h-20 rounded-xl bg-gray-200" />)}
          </div>
        ) : plans.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">Aucune formule créée.</p>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm gap-3 ${plan.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{plan.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${plan.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {plan.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  {plan.description && (
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{plan.description}</p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                    <span className="font-semibold text-gray-800">{formatPrice(plan.price_cents)}</span>
                    <span>·</span>
                    <span>{INTERVAL_LABELS[plan.interval] ?? plan.interval}</span>
                    {plan.includes_coaching && <span>· Coaching inclus</span>}
                    {plan.max_sessions_per_month && (
                      <span>· {plan.max_sessions_per_month} séances/mois</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(plan)}
                  disabled={toggling[plan.id]}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 transition-colors ${
                    plan.is_active
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {plan.is_active ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

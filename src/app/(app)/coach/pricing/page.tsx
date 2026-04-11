'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/pulse/badge';
import { EmptyState } from '@/components/pulse/empty-state';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  type: 'single' | 'pack' | 'subscription';
  price_cents: number;
  sessions_count: number;
  sessions_per_week: number | null;
  validity_days: number | null;
  is_active: boolean;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  single: { label: 'Séance unique', color: 'info' },
  pack: { label: 'Pack', color: 'success' },
  subscription: { label: 'Abonnement', color: 'warning' },
};

const TYPE_OPTIONS = [
  { value: 'single', label: 'Séance unique — paiement à la séance' },
  { value: 'pack', label: 'Pack — X séances prépayées' },
  { value: 'subscription', label: 'Abonnement — mensuel récurrent' },
];

export default function CoachPricingPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'single' | 'pack' | 'subscription'>('single');
  const [price, setPrice] = useState('');
  const [sessionsCount, setSessionsCount] = useState('1');
  const [sessionsPerWeek, setSessionsPerWeek] = useState('');
  const [validityDays, setValidityDays] = useState('');

  const fetchPlans = useCallback(async () => {
    const res = await fetch('/api/coaches/me/pricing');
    if (res.ok) setPlans(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const resetForm = () => {
    setName(''); setDescription(''); setType('single'); setPrice('');
    setSessionsCount('1'); setSessionsPerWeek(''); setValidityDays('');
    setShowForm(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;
    setSaving(true);

    const res = await fetch('/api/coaches/me/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        type,
        price_cents: Math.round(parseFloat(price) * 100),
        sessions_count: parseInt(sessionsCount, 10) || 1,
        sessions_per_week: sessionsPerWeek ? parseInt(sessionsPerWeek, 10) : null,
        validity_days: validityDays ? parseInt(validityDays, 10) : null,
      }),
    });

    if (res.ok) {
      resetForm();
      fetchPlans();
    }
    setSaving(false);
  };

  const toggleActive = async (planId: string, active: boolean) => {
    await fetch(`/api/coaches/me/pricing/${planId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !active }),
    });
    fetchPlans();
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-extrabold text-text">Mes tarifs</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + Nouvelle offre
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-border bg-white p-5 mb-6 space-y-4">
          <h2 className="text-sm font-bold text-text">Nouvelle offre tarifaire</h2>

          {/* Type selector */}
          <div className="space-y-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value as any)}
                className={`w-full rounded-xl border p-3 text-left text-sm transition ${
                  type === opt.value
                    ? 'border-brand-500 bg-brand-500/5 font-semibold text-text'
                    : 'border-border text-muted hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-text">Nom de l'offre</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={type === 'single' ? 'Ex: Séance coaching individuel' : type === 'pack' ? 'Ex: Pack 10 séances' : 'Ex: Abonnement Premium'}
              className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Décrivez ce que comprend cette offre..."
              rows={2}
              className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-text">Prix (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder={type === 'subscription' ? '99.00/mois' : '50.00'}
                className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm"
                required
              />
            </div>
            {(type === 'pack' || type === 'subscription') && (
              <div>
                <label className="text-sm font-medium text-text">Nombre de séances</label>
                <input
                  type="number"
                  min="1"
                  value={sessionsCount}
                  onChange={e => setSessionsCount(e.target.value)}
                  placeholder={type === 'pack' ? '10' : '4'}
                  className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm"
                />
              </div>
            )}
          </div>

          {type === 'subscription' && (
            <div>
              <label className="text-sm font-medium text-text">Séances par semaine</label>
              <input
                type="number"
                min="1"
                value={sessionsPerWeek}
                onChange={e => setSessionsPerWeek(e.target.value)}
                placeholder="2"
                className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm"
              />
            </div>
          )}

          {type === 'pack' && (
            <div>
              <label className="text-sm font-medium text-text">Validité (jours)</label>
              <input
                type="number"
                min="1"
                value={validityDays}
                onChange={e => setValidityDays(e.target.value)}
                placeholder="90"
                className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={resetForm} className="flex-1 rounded-xl bg-surface py-2.5 text-sm font-semibold text-muted">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? 'Création...' : 'Créer l\'offre'}
            </button>
          </div>
        </form>
      )}

      {/* Plans list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface" />)}
        </div>
      ) : plans.length === 0 && !showForm ? (
        <EmptyState
          icon="💰"
          title="Aucune offre tarifaire"
          description="Créez vos offres pour que les athlètes puissent réserver et payer."
          actionLabel="Créer une offre"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="space-y-3">
          {plans.map(plan => {
            const typeInfo = TYPE_LABELS[plan.type] || TYPE_LABELS.single;
            return (
              <div key={plan.id} className={`rounded-2xl border bg-white p-4 ${plan.is_active ? 'border-border' : 'border-border/50 opacity-60'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-text">{plan.name}</p>
                      <Badge variant={typeInfo.color as any}>{typeInfo.label}</Badge>
                      {!plan.is_active && <Badge variant="danger">Inactif</Badge>}
                    </div>
                    {plan.description && <p className="text-xs text-muted mb-2">{plan.description}</p>}
                    <p className="text-lg font-extrabold text-text">
                      {(plan.price_cents / 100).toFixed(2)} €
                      {plan.type === 'subscription' && <span className="text-sm font-normal text-muted">/mois</span>}
                    </p>
                    {plan.type === 'pack' && (
                      <p className="text-xs text-muted">{plan.sessions_count} séances · {plan.validity_days ? `${plan.validity_days}j de validité` : 'Sans expiration'}</p>
                    )}
                    {plan.type === 'subscription' && plan.sessions_per_week && (
                      <p className="text-xs text-muted">{plan.sessions_per_week} séance{plan.sessions_per_week > 1 ? 's' : ''}/semaine</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleActive(plan.id, plan.is_active)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      plan.is_active
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {plan.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

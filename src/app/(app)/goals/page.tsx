'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/pulse/app-header';
import { EmptyState } from '@/components/pulse/empty-state';
import { Button } from '@/components/pulse/button';
import { Input } from '@/components/pulse/input';
import { Select } from '@/components/pulse/select';
import { Badge } from '@/components/pulse/badge';
import { useAuthStore } from '@/stores/auth';

interface Goal {
  id: string;
  title: string;
  type: string;
  target_value: number;
  current_value: number;
  unit: string;
  deadline: string | null;
  status: string;
  created_at: string;
}

const GOAL_TYPE_LABELS: Record<string, string> = {
  frequency: 'Fréquence',
  performance: 'Performance',
  weight: 'Poids',
  custom: 'Personnalisé',
};

const GOAL_TYPE_EMOJIS: Record<string, string> = {
  frequency: '📅',
  performance: '⚡',
  weight: '⚖️',
  custom: '🎯',
};

export default function GoalsPage() {
  const { userId } = useAuthStore();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');

  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState('frequency');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchGoals = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    const params = filter !== 'all' ? `?status=${filter}` : '';
    fetch(`/api/goals${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setGoals(Array.isArray(data) ? data : []))
      .catch(() => setGoals([]))
      .finally(() => setLoading(false));
  }, [userId, filter]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title || !targetValue) {
      setError('Titre et valeur cible requis');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type,
          target_value: parseFloat(targetValue),
          unit,
          deadline: deadline ? new Date(deadline).toISOString() : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }
      setTitle('');
      setTargetValue('');
      setUnit('');
      setDeadline('');
      setShowForm(false);
      fetchGoals();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de création');
    } finally {
      setSubmitting(false);
    }
  };

  const updateGoal = async (id: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) fetchGoals();
    } catch { /* ignore */ }
  };

  const deleteGoal = async (id: string) => {
    try {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (res.ok) fetchGoals();
    } catch { /* ignore */ }
  };

  return (
    <>
      <AppHeader title="Mes objectifs" />
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="hidden md:block text-2xl font-extrabold text-text">Mes objectifs</h1>
          <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Annuler' : '+ Nouvel objectif'}
          </Button>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="mb-6 rounded-2xl border border-brand-200 bg-brand-500/5 p-5 space-y-4">
            <h3 className="text-sm font-bold text-text">Créer un objectif</h3>
            <Input
              label="Titre"
              required
              placeholder="Ex: 10 séances par mois"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Type"
                required
                options={[
                  { value: 'frequency', label: '📅 Fréquence' },
                  { value: 'performance', label: '⚡ Performance' },
                  { value: 'weight', label: '⚖️ Poids' },
                  { value: 'custom', label: '🎯 Personnalisé' },
                ]}
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
              <Input
                label="Valeur cible"
                required
                type="number"
                min={0}
                step="any"
                placeholder="10"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Unité"
                placeholder="séances, kg, km..."
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
              <Input
                label="Date limite"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" variant="primary" loading={submitting}>Créer</Button>
          </form>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['active', 'completed', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                filter === f ? 'bg-gradient-to-r from-brand-500 to-cyan-500 text-white' : 'bg-surface text-muted'
              }`}
            >
              {f === 'active' ? 'Actifs' : f === 'completed' ? 'Terminés' : 'Tous'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface" />)}</div>
        ) : goals.length > 0 ? (
          <div className="space-y-3">
            {goals.map((goal) => {
              const percent = goal.target_value > 0 ? Math.min(Math.round((goal.current_value / goal.target_value) * 100), 100) : 0;
              return (
                <div key={goal.id} className="rounded-2xl border border-border bg-white p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{GOAL_TYPE_EMOJIS[goal.type] || '🎯'}</span>
                      <div>
                        <p className="text-sm font-bold text-text">{goal.title}</p>
                        <p className="text-xs text-muted">
                          {GOAL_TYPE_LABELS[goal.type] || goal.type}
                          {goal.deadline && ` · Avant le ${new Date(goal.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {goal.status === 'active' && (
                        <Badge variant="success">Actif</Badge>
                      )}
                      {goal.status === 'completed' && (
                        <Badge variant="info">Terminé</Badge>
                      )}
                      {goal.status === 'archived' && (
                        <Badge variant="sport">Archivé</Badge>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted">{goal.current_value} / {goal.target_value} {goal.unit}</span>
                      <span className="font-bold text-brand-500">{percent}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-500 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  {goal.status === 'active' && (
                    <div className="flex items-center gap-2 mt-3">
                      <Input
                        type="number"
                        placeholder="Progression..."
                        className="flex-1"
                        min={0}
                        step="any"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = parseFloat((e.target as HTMLInputElement).value);
                            if (!isNaN(val)) {
                              updateGoal(goal.id, { current_value: val });
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateGoal(goal.id, { status: 'completed' })}
                      >
                        ✓ Terminé
                      </Button>
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="text-muted hover:text-danger transition text-sm px-2"
                        title="Supprimer"
                      >
                        🗑
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            <EmptyState
              icon="🎯"
              title="Aucun objectif défini"
              description="Fixez votre premier objectif pour suivre vos progrès"
              actionLabel="Nouvel objectif"
              onAction={() => setShowForm(true)}
            />

            {/* Goal template suggestions */}
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">Suggestions rapides</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { emoji: '🏃', title: 'Courir 5km', type: 'performance', target: 5, unit: 'km' },
                  { emoji: '💪', title: "S'entraîner 3x/semaine", type: 'frequency', target: 3, unit: 'séances/sem' },
                  { emoji: '⚖️', title: 'Perdre 3kg', type: 'weight', target: 3, unit: 'kg' },
                ].map((tpl) => (
                  <button
                    key={tpl.title}
                    onClick={() => {
                      setTitle(tpl.title);
                      setType(tpl.type);
                      setTargetValue(String(tpl.target));
                      setUnit(tpl.unit);
                      setShowForm(true);
                    }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 text-left transition hover:border-brand-300 hover:shadow-sm"
                  >
                    <span className="text-2xl">{tpl.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-text">{tpl.title}</p>
                      <p className="text-xs text-muted">{tpl.target} {tpl.unit}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

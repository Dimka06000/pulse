'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProgramRule {
  id: string;
  title: string;
  trigger: string;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
  is_active: boolean;
}

interface RuleEditorModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (rule: ProgramRule) => void;
  programId: string;
  routines?: { id: string; title: string; type: string }[];
  editRule?: ProgramRule | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TRIGGERS = [
  { value: 'before_session', label: 'Avant chaque séance' },
  { value: 'every_nth_week', label: 'Toutes les N semaines' },
  { value: 'tsb_threshold', label: 'Seuil de fatigue' },
  { value: 'cycle_phase', label: 'Phase du cycle' },
  { value: 'after_race', label: 'Après compétition' },
  { value: 'always', label: 'Toujours' },
] as const;

const SESSION_TYPES = [
  { value: 'strength', label: 'Force' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'all', label: 'Toutes' },
] as const;

const CYCLE_PHASES = [
  { value: 'menstruation', label: 'Règles' },
  { value: 'follicular', label: 'Folliculaire' },
  { value: 'ovulation', label: 'Ovulation' },
  { value: 'luteal', label: 'Lutéale' },
] as const;

const ACTION_TYPES = [
  { value: 'insert_routine', label: 'Insérer routine', selectedBg: 'bg-green-100 text-green-800' },
  { value: 'reduce_intensity', label: 'Réduire intensité', selectedBg: 'bg-orange-100 text-orange-800' },
  { value: 'swap_session', label: 'Remplacer séance', selectedBg: 'bg-blue-100 text-blue-800' },
  { value: 'alert', label: 'Alerte', selectedBg: 'bg-red-100 text-red-800' },
] as const;

// ─── Component ──────────────────────────────────────────────────────────────

export function RuleEditorModal({
  open,
  onClose,
  onSaved,
  programId,
  routines = [],
  editRule,
}: RuleEditorModalProps) {
  const [title, setTitle] = useState('');
  const [trigger, setTrigger] = useState('before_session');
  const [condition, setCondition] = useState<Record<string, unknown>>({});
  const [actionType, setActionType] = useState('insert_routine');
  const [actionConfig, setActionConfig] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editRule;

  // Prefill when editing
  useEffect(() => {
    if (editRule) {
      setTitle(editRule.title);
      setTrigger(editRule.trigger);
      setCondition(editRule.condition ?? {});
      const aType = (editRule.action?.type as string) ?? 'insert_routine';
      setActionType(aType);
      setActionConfig(editRule.action ?? {});
    } else {
      setTitle('');
      setTrigger('before_session');
      setCondition({});
      setActionType('insert_routine');
      setActionConfig({});
    }
    setError(null);
  }, [editRule, open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // ── Condition UI helpers ─────────────────────────────────────────────────

  function renderConditionUI() {
    switch (trigger) {
      case 'before_session':
        return (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Type de séance</label>
            <div className="flex flex-wrap gap-2">
              {SESSION_TYPES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setCondition({ session_type: s.value })}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    (condition.session_type ?? 'all') === s.value
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'every_nth_week':
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Toutes les</span>
            <Input
              type="number"
              min={2}
              max={12}
              value={(condition.every_n as number) ?? 4}
              onChange={(e) => setCondition({ every_n: Number(e.target.value) })}
              className="w-20"
            />
            <span className="text-sm text-gray-700">semaines</span>
          </div>
        );

      case 'tsb_threshold':
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Quand TSB inférieur à</span>
            <Input
              type="number"
              value={(condition.threshold as number) ?? -20}
              onChange={(e) => setCondition({ threshold: Number(e.target.value) })}
              className="w-24"
            />
          </div>
        );

      case 'cycle_phase':
        return (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Phase</label>
            <div className="flex flex-wrap gap-2">
              {CYCLE_PHASES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setCondition({ phase: p.value })}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    condition.phase === p.value
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  // ── Action config UI ─────────────────────────────────────────────────────

  function renderActionConfig() {
    switch (actionType) {
      case 'insert_routine':
        return (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Routine</label>
            {routines.length > 0 ? (
              <select
                value={(actionConfig.routine_id as string) ?? ''}
                onChange={(e) => {
                  const r = routines.find((r) => r.id === e.target.value);
                  setActionConfig({
                    type: 'insert_routine',
                    routine_id: e.target.value,
                    routine_title: r?.title ?? '',
                  });
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                  focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">Choisir une routine...</option>
                {routines.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-400">Aucune routine disponible</p>
            )}
          </div>
        );

      case 'reduce_intensity':
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Réduire de</span>
            <Input
              type="number"
              min={1}
              max={100}
              value={(actionConfig.percent as number) ?? 15}
              onChange={(e) =>
                setActionConfig({ type: 'reduce_intensity', percent: Number(e.target.value) })
              }
              className="w-20"
            />
            <span className="text-sm text-gray-700">%</span>
          </div>
        );

      case 'swap_session':
        return (
          <Input
            label="Remplacer par"
            placeholder="Récupération active"
            value={(actionConfig.replacement as string) ?? ''}
            onChange={(e) =>
              setActionConfig({ type: 'swap_session', replacement: e.target.value })
            }
          />
        );

      case 'alert':
        return (
          <Input
            label="Message"
            placeholder="Fatigue élevée — envisagez un jour de repos"
            value={(actionConfig.message as string) ?? ''}
            onChange={(e) => setActionConfig({ type: 'alert', message: e.target.value })}
          />
        );

      default:
        return null;
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        trigger,
        condition,
        action: { ...actionConfig, type: actionType },
        is_active: editRule?.is_active ?? true,
      };

      if (isEdit && editRule?.id) {
        payload.rule_id = editRule.id;
      }

      const res = await fetch(`/api/programs/${programId}/rules`, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur');
        return;
      }

      const saved = await res.json();
      onSaved(saved);
      onClose();
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Modifier la règle' : 'Nouvelle règle'}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl z-10 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text">
              {isEdit ? 'Modifier la règle' : 'Nouvelle règle'}
            </h2>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-5 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Section 1: Title */}
          <Input
            label="Titre"
            placeholder="Ex: Deload automatique, Alerte fatigue..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Section 2: Trigger */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Déclencheur</label>
            <div className="flex flex-wrap gap-2">
              {TRIGGERS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setTrigger(t.value);
                    setCondition({});
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    trigger === t.value
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Condition builder */}
          {renderConditionUI()}

          {/* Section 3: Action */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Action</label>
            <div className="flex flex-wrap gap-2">
              {ACTION_TYPES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => {
                    setActionType(a.value);
                    setActionConfig({});
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    actionType === a.value
                      ? `${a.selectedBg} shadow-sm`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action config */}
          {renderActionConfig()}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !title.trim()} className="flex-1">
            {loading
              ? isEdit
                ? 'Mise à jour...'
                : 'Création...'
              : isEdit
                ? 'Enregistrer'
                : 'Créer la règle'}
          </Button>
        </div>
      </div>
    </div>
  );
}

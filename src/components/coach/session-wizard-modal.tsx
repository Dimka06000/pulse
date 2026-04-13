'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  SPORTS,
  SPORT_LABELS,
  SPORT_EMOJIS,
  SPORT_GRADIENT_CLASSES,
  type Sport,
} from '@/lib/sports';
import { formatPrice } from '@oikos/coaching';

// ─── Types ──────────────────────────────────────────────────────────────────
export type SessionTemplate = {
  id: string;
  title: string;
  sport: string;
  description: string | null;
  level: string;
  type: string;
  max_participants: number;
  duration: number;
  price: number;
  is_active?: boolean;
};

type FormData = {
  sport: string;
  title: string;
  description: string;
  level: string;
  type: string;
  max_participants: number;
  duration: number;
  price: number;
};

interface SessionWizardModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (session: SessionTemplate) => void;
  editSession?: SessionTemplate | null;
}

// ─── Constants (matching DB enums) ──────────────────────────────────────────
const LEVELS = [
  { value: 'all', label: 'Tous niveaux' },
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
];

const TYPES = [
  { value: 'individual', label: 'Individuel', icon: '👤', desc: 'Coaching personnalisé en 1-to-1' },
  { value: 'group', label: 'Groupe', icon: '👥', desc: 'Séance collective, plusieurs participants' },
  { value: 'online', label: 'En ligne', icon: '💻', desc: 'Coaching à distance en visio' },
];

const DURATIONS = [30, 45, 60, 90, 120];

const STEP_LABELS = ['Sport & Infos', 'Format & Tarif', 'Aperçu'];

const DEFAULT_FORM: FormData = {
  sport: '',
  title: '',
  description: '',
  level: 'all',
  type: 'individual',
  max_participants: 1,
  duration: 60,
  price: 50,
};

// ─── Component ──────────────────────────────────────────────────────────────
export function SessionWizardModal({
  open,
  onClose,
  onSaved,
  editSession,
}: SessionWizardModalProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editSession;

  // Prefill form when editing
  useEffect(() => {
    if (editSession) {
      setForm({
        sport: editSession.sport,
        title: editSession.title,
        description: editSession.description || '',
        level: editSession.level,
        type: editSession.type,
        max_participants: editSession.max_participants,
        duration: editSession.duration,
        price: editSession.price,
      });
      setStep(0);
    } else {
      setForm(DEFAULT_FORM);
      setStep(0);
    }
    setError(null);
  }, [editSession, open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function updateForm(updates: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  function canGoNext(): boolean {
    if (step === 0) return !!form.sport && !!form.title.trim();
    if (step === 1) return form.price >= 0 && form.duration > 0;
    return true;
  }

  function handleNext() {
    if (step < 2) setStep(step + 1);
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...(isEdit ? { id: editSession!.id } : {}),
        title: form.title.trim(),
        sport: form.sport,
        description: form.description.trim() || '',
        level: form.level,
        type: form.type,
        max_participants: form.type === 'group' ? form.max_participants : 1,
        duration: form.duration,
        price: form.price,
      };

      const res = await fetch('/api/coaches/me/sessions', {
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

  const sportData = form.sport
    ? { label: SPORT_LABELS[form.sport as Sport], emoji: SPORT_EMOJIS[form.sport as Sport] }
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={isEdit ? 'Modifier la séance' : 'Nouvelle séance'}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl z-10 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-text">
              {isEdit ? 'Modifier la séance' : 'Nouvelle séance'}
            </h2>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
            >
              ✕
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex gap-2">
            {STEP_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className="flex-1 text-center"
              >
                <div
                  className={`h-1 rounded-full mb-1.5 transition-colors ${
                    i <= step ? 'bg-brand-500' : 'bg-gray-200'
                  }`}
                />
                <span
                  className={`text-[11px] font-medium transition-colors ${
                    i === step
                      ? 'text-brand-600'
                      : i < step
                        ? 'text-gray-500'
                        : 'text-gray-300'
                  }`}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-5">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Step 0: Sport & Infos */}
          {step === 0 && (
            <div className="space-y-5">
              {/* Sport grid */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Sport</label>
                <div className="grid grid-cols-4 gap-2">
                  {SPORTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateForm({ sport: s })}
                      className={`flex flex-col items-center gap-1 rounded-xl p-3 text-center transition-all ${
                        form.sport === s
                          ? 'bg-brand-50 ring-2 ring-brand-500 shadow-sm'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-2xl">{SPORT_EMOJIS[s]}</span>
                      <span className="text-[11px] font-medium text-gray-700 leading-tight">
                        {SPORT_LABELS[s]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Titre de la séance"
                placeholder="Ex: Cours de boxe débutant, HIIT intensif..."
                value={form.title}
                onChange={(e) => updateForm({ title: e.target.value })}
              />

              <Textarea
                label="Description (optionnel)"
                placeholder="Décrivez le contenu de la séance, les objectifs, le matériel nécessaire..."
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                rows={3}
              />
            </div>
          )}

          {/* Step 1: Format & Tarif */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Type cards */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => updateForm({ type: t.value })}
                      className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-all ${
                        form.type === t.value
                          ? 'bg-brand-50 ring-2 ring-brand-500 shadow-sm'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-xl">{t.icon}</span>
                      <span className="text-xs font-semibold text-gray-800">{t.label}</span>
                      <span className="text-[10px] text-gray-500 leading-tight">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Max participants (group only) */}
              {form.type === 'group' && (
                <Input
                  label="Participants max"
                  type="number"
                  min={2}
                  max={50}
                  value={form.max_participants}
                  onChange={(e) => updateForm({ max_participants: Number(e.target.value) })}
                />
              )}

              {/* Level */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Niveau</label>
                <div className="flex gap-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => updateForm({ level: l.value })}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                        form.level === l.value
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Durée</label>
                <div className="flex gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => updateForm({ duration: d })}
                      className={`flex-1 rounded-lg px-3 py-2.5 text-center transition-all ${
                        form.duration === d
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span className="text-sm font-semibold">{d}</span>
                      <span className="text-[10px] block opacity-75">min</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Prix par séance
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    value={form.price}
                    onChange={(e) => updateForm({ price: Number(e.target.value) })}
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                    EUR
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">
                Voici comment votre séance apparaîtra aux clients :
              </p>

              {/* Preview card */}
              <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {/* Gradient header */}
                <div
                  className={`bg-gradient-to-r ${
                    SPORT_GRADIENT_CLASSES[form.sport as Sport] || 'from-gray-400 to-gray-500'
                  } px-5 py-4`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {sportData?.emoji || '⚡'}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-white">{form.title || 'Sans titre'}</h3>
                      <p className="text-sm text-white/80">{sportData?.label || form.sport}</p>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-3">
                  {form.description && (
                    <p className="text-sm text-gray-600">{form.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
                      {TYPES.find((t) => t.value === form.type)?.icon}{' '}
                      {TYPES.find((t) => t.value === form.type)?.label}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
                      {LEVELS.find((l) => l.value === form.level)?.label}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
                      {form.duration} min
                    </span>
                    {form.type === 'group' && form.max_participants > 1 && (
                      <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
                        Max {form.max_participants} pers.
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Prix par séance</span>
                    <span className="text-xl font-bold text-brand-600">
                      {formatPrice(Math.round(form.price * 100))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3">
          {step > 0 ? (
            <Button variant="secondary" onClick={handleBack} className="flex-1">
              Retour
            </Button>
          ) : (
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Annuler
            </Button>
          )}

          {step < 2 ? (
            <Button onClick={handleNext} disabled={!canGoNext()} className="flex-1">
              Suivant
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading
                ? isEdit
                  ? 'Mise à jour...'
                  : 'Création...'
                : isEdit
                  ? 'Enregistrer'
                  : 'Créer la séance'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

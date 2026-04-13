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
export type ProgramData = {
  id: string;
  title: string;
  description: string | null;
  sport: string;
  level: string;
  duration_weeks: number;
  is_published: boolean;
  price: number;
  created_at: string;
};

type FormData = {
  sport: string;
  title: string;
  description: string;
  level: string;
  duration_weeks: number;
  price: number;
};

interface ProgramWizardModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (program: ProgramData) => void;
  editProgram?: ProgramData | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const LEVELS = [
  { value: 'all', label: 'Tous niveaux' },
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
];

const WEEK_PRESETS = [4, 6, 8, 10, 12];

const STEP_LABELS = ['Sport & Infos', 'Durée & Tarif', 'Aperçu'];

const DEFAULT_FORM: FormData = {
  sport: '',
  title: '',
  description: '',
  level: 'all',
  duration_weeks: 8,
  price: 0,
};

// ─── Component ──────────────────────────────────────────────────────────────
export function ProgramWizardModal({
  open,
  onClose,
  onSaved,
  editProgram,
}: ProgramWizardModalProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [customWeeks, setCustomWeeks] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editProgram;

  useEffect(() => {
    if (editProgram) {
      setForm({
        sport: editProgram.sport,
        title: editProgram.title,
        description: editProgram.description || '',
        level: editProgram.level,
        duration_weeks: editProgram.duration_weeks,
        price: editProgram.price,
      });
      setCustomWeeks(!WEEK_PRESETS.includes(editProgram.duration_weeks));
      setStep(0);
    } else {
      setForm(DEFAULT_FORM);
      setCustomWeeks(false);
      setStep(0);
    }
    setError(null);
  }, [editProgram, open]);

  if (!open) return null;

  function updateForm(updates: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  function canGoNext(): boolean {
    if (step === 0) return !!form.sport && !!form.title.trim();
    if (step === 1) return form.duration_weeks > 0 && form.price >= 0;
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
        title: form.title.trim(),
        description: form.description.trim() || '',
        sport: form.sport,
        level: form.level,
        duration_weeks: form.duration_weeks,
        price: form.price,
      };

      const url = isEdit ? `/api/programs/${editProgram!.id}` : '/api/programs';
      const res = await fetch(url, {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl z-10 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-text">
              {isEdit ? 'Modifier le programme' : 'Nouveau programme'}
            </h2>
            <button
              onClick={onClose}
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
                label="Titre du programme"
                placeholder="Ex: Programme Force 8 semaines, Prépa marathon..."
                value={form.title}
                onChange={(e) => updateForm({ title: e.target.value })}
              />

              <Textarea
                label="Description (optionnel)"
                placeholder="Décrivez les objectifs du programme, le public visé, le matériel nécessaire..."
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                rows={3}
              />

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
            </div>
          )}

          {/* Step 1: Durée & Tarif */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Duration in weeks */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Durée (semaines)
                </label>
                <div className="flex gap-2 flex-wrap">
                  {WEEK_PRESETS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        updateForm({ duration_weeks: w });
                        setCustomWeeks(false);
                      }}
                      className={`rounded-lg px-4 py-2.5 text-center transition-all ${
                        !customWeeks && form.duration_weeks === w
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span className="text-sm font-semibold">{w}</span>
                      <span className="text-[10px] block opacity-75">sem.</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustomWeeks(true)}
                    className={`rounded-lg px-4 py-2.5 text-center transition-all ${
                      customWeeks
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="text-sm font-semibold">...</span>
                    <span className="text-[10px] block opacity-75">perso</span>
                  </button>
                </div>
                {customWeeks && (
                  <div className="mt-3">
                    <Input
                      type="number"
                      min={1}
                      max={52}
                      placeholder="Nombre de semaines"
                      value={form.duration_weeks}
                      onChange={(e) => updateForm({ duration_weeks: Number(e.target.value) })}
                    />
                  </div>
                )}
              </div>

              {/* Price */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Prix du programme
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
                Voici comment votre programme apparaîtra aux clients :
              </p>

              <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div
                  className={`bg-gradient-to-r ${
                    SPORT_GRADIENT_CLASSES[form.sport as Sport] || 'from-gray-400 to-gray-500'
                  } px-5 py-4`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{sportData?.emoji || '⚡'}</span>
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
                    <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
                      {LEVELS.find((l) => l.value === form.level)?.label}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
                      {form.duration_weeks} semaines
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Prix du programme</span>
                    <span className="text-xl font-bold text-brand-600">
                      {form.price > 0
                        ? formatPrice(Math.round(form.price * 100))
                        : 'Gratuit'}
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
                  : 'Créer le programme'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

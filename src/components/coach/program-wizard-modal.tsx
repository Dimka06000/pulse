'use client';

import { useState, useEffect, useCallback } from 'react';
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
import type { AthleteCalibration } from '@/lib/training/calibration';

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

type EventSuggestion = {
  name: string;
  sport: string;
  distanceKm: number | null;
  terrainType: string | null;
  location: string;
  date: string | null;
  elevationM?: number | null;
  source: string;
};

// Map event sport strings to our Sport[] types
const EVENT_SPORT_MAP: Record<string, Sport[]> = {
  running: ['running'],
  trail: ['trail'],
  triathlon: ['natation', 'cyclisme', 'running'],
  duathlon: ['cyclisme', 'running'],
  crossfit: ['crossfit'],
  cyclisme: ['cyclisme'],
  natation: ['natation'],
  musculation: ['musculation'],
  yoga: ['yoga'],
  fitness: ['fitness'],
  boxe: ['boxe'],
};

type FormData = {
  sports: Sport[];
  title: string;
  description: string;
  level: string;
  duration_weeks: number;
  price: number;
  athleteId: string;
  hasTargetEvent: boolean;
  eventName: string;
  eventDate: string;
  eventDistanceKm: number | null;
  eventElevationM: number | null;
  eventTerrainType: 'road' | 'trail' | 'mixed' | null;
  eventLocation: string;
};

interface ProgramWizardModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (program: ProgramData) => void;
  editProgram?: ProgramData | null;
  athleteId?: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const LEVELS = [
  { value: 'all', label: 'Tous niveaux' },
  { value: 'beginner', label: 'Debutant' },
  { value: 'intermediate', label: 'Intermediaire' },
  { value: 'advanced', label: 'Avance' },
];

const WEEK_PRESETS = [4, 6, 8, 10, 12];

const STEP_LABELS = ['Objectif', 'Details', 'Duree & Tarif', 'Apercu'];

const TERRAIN_TYPES = [
  { value: 'road' as const, label: 'Route' },
  { value: 'trail' as const, label: 'Trail' },
  { value: 'mixed' as const, label: 'Mixte' },
];

const DEFAULT_FORM: FormData = {
  sports: [],
  title: '',
  description: '',
  level: 'all',
  duration_weeks: 8,
  price: 0,
  athleteId: '',
  hasTargetEvent: false,
  eventName: '',
  eventDate: '',
  eventDistanceKm: null,
  eventElevationM: null,
  eventTerrainType: null,
  eventLocation: '',
};

const LEVEL_MAP: Record<string, string> = {
  beginner: 'Debutant',
  intermediate: 'Intermediaire',
  advanced: 'Avance',
};

// ─── Component ──────────────────────────────────────────────────────────────
export function ProgramWizardModal({
  open,
  onClose,
  onSaved,
  editProgram,
  athleteId: externalAthleteId,
}: ProgramWizardModalProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [customWeeks, setCustomWeeks] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<AthleteCalibration | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);

  // Event autocomplete
  const [eventSuggestions, setEventSuggestions] = useState<EventSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingEvents, setSearchingEvents] = useState(false);
  const [eventQuery, setEventQuery] = useState('');

  const isEdit = !!editProgram;
  const effectiveAthleteId = form.athleteId || externalAthleteId || '';

  // Event search with debounce
  useEffect(() => {
    if (!eventQuery || eventQuery.length < 2) {
      setEventSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingEvents(true);
      try {
        const res = await fetch(`/api/events/search?q=${encodeURIComponent(eventQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setEventSuggestions(data);
          setShowSuggestions(data.length > 0);
        }
      } catch { /* ignore */ }
      setSearchingEvents(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [eventQuery]);

  const handleSelectEvent = useCallback((ev: EventSuggestion) => {
    const mappedSports = EVENT_SPORT_MAP[ev.sport] || [];
    const autoTitle = ev.distanceKm
      ? `Preparation ${ev.name}`
      : `Programme ${ev.name}`;

    // Auto-calculate weeks from event date
    let weeks = form.duration_weeks;
    if (ev.date) {
      const eventDate = new Date(ev.date);
      const today = new Date();
      const diffMs = eventDate.getTime() - today.getTime();
      weeks = Math.max(4, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7)));
    }

    setForm((prev) => ({
      ...prev,
      hasTargetEvent: true,
      eventName: ev.name,
      eventDate: ev.date || '',
      eventDistanceKm: ev.distanceKm,
      eventElevationM: ev.elevationM ?? null,
      eventTerrainType: (ev.terrainType as 'road' | 'trail' | 'mixed') || null,
      eventLocation: ev.location || '',
      sports: mappedSports.length > 0 ? mappedSports : prev.sports,
      title: autoTitle,
      duration_weeks: weeks,
    }));
    setShowSuggestions(false);
  }, [form.duration_weeks]);

  const handleCalibrate = useCallback(async () => {
    if (!effectiveAthleteId) return;
    setCalibrating(true);
    setCalibrationError(null);
    try {
      const res = await fetch(`/api/athletes/${effectiveAthleteId}/calibrate`);
      if (!res.ok) {
        const data = await res.json();
        setCalibrationError(data.error || 'Erreur de calibration');
        return;
      }
      const data: AthleteCalibration = await res.json();
      setCalibration(data);
      if (data.dataPoints > 0) {
        setForm((prev) => ({ ...prev, level: data.suggestedLevel }));
      }
    } catch {
      setCalibrationError('Erreur reseau');
    } finally {
      setCalibrating(false);
    }
  }, [effectiveAthleteId]);

  useEffect(() => {
    if (editProgram) {
      setForm({
        sports: [editProgram.sport as Sport],
        title: editProgram.title,
        description: editProgram.description || '',
        level: editProgram.level,
        duration_weeks: editProgram.duration_weeks,
        price: editProgram.price,
        athleteId: externalAthleteId || '',
        hasTargetEvent: false,
        eventName: '',
        eventDate: '',
        eventDistanceKm: null,
        eventElevationM: null,
        eventTerrainType: null,
        eventLocation: '',
      });
      setCustomWeeks(!WEEK_PRESETS.includes(editProgram.duration_weeks));
      setStep(0);
    } else {
      setForm({ ...DEFAULT_FORM, athleteId: externalAthleteId || '' });
      setCustomWeeks(false);
      setStep(0);
      setEventQuery('');
    }
    setError(null);
    setCalibration(null);
    setCalibrationError(null);
  }, [editProgram, open, externalAthleteId]);

  if (!open) return null;

  function updateForm(updates: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  function toggleSport(s: Sport) {
    setForm((prev) => {
      const has = prev.sports.includes(s);
      return {
        ...prev,
        sports: has ? prev.sports.filter((sp) => sp !== s) : [...prev.sports, s],
      };
    });
  }

  // Primary sport for API (first selected)
  const primarySport = form.sports[0] || '';

  function canGoNext(): boolean {
    if (step === 0) return true; // event is optional — can skip with "Programme libre"
    if (step === 1) return form.sports.length > 0 && !!form.title.trim();
    if (step === 2) return form.duration_weeks > 0 && form.price >= 0;
    return true;
  }

  function handleNext() {
    if (step < 3) setStep(step + 1);
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
        sport: primarySport,
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
      setError('Erreur reseau');
    } finally {
      setLoading(false);
    }
  }

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

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* Step 0: Objectif — Event search as primary entry point           */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">
                Recherchez un evenement ou creez un programme libre.
              </p>

              {/* Event search bar */}
              <div className="relative">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Marathon de Paris, UTMB, Ironman, Spartan..."
                    value={eventQuery}
                    onChange={(e) => {
                      setEventQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => eventSuggestions.length > 0 && setShowSuggestions(true)}
                    autoComplete="off"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition placeholder:text-gray-400"
                  />
                  {searchingEvents && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">
                      Recherche...
                    </div>
                  )}
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && eventSuggestions.length > 0 && (
                  <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-xl max-h-72 overflow-y-auto">
                    {eventSuggestions.map((ev, i) => {
                      const sports = EVENT_SPORT_MAP[ev.sport] || [];
                      return (
                        <button
                          key={`${ev.name}-${i}`}
                          type="button"
                          className="w-full text-left px-4 py-3.5 hover:bg-brand-50 transition-colors border-b border-gray-50 last:border-0"
                          onClick={() => {
                            handleSelectEvent(ev);
                            setEventQuery(ev.name);
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-semibold text-sm text-gray-900">{ev.name}</div>
                            <div className="flex gap-0.5 shrink-0">
                              {sports.map((s) => (
                                <span key={s} className="text-base">{SPORT_EMOJIS[s]}</span>
                              ))}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                            {ev.location && <span>📍 {ev.location}</span>}
                            {ev.distanceKm && <span>📏 {ev.distanceKm} km</span>}
                            {ev.elevationM && <span>⛰️ {ev.elevationM}m D+</span>}
                            {ev.date && (
                              <span>
                                📅{' '}
                                {new Date(ev.date).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected event card */}
              {form.hasTargetEvent && (
                <div className="rounded-xl border-2 border-brand-200 bg-brand-50/50 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-brand-700">{form.eventName}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{form.eventLocation}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        updateForm({
                          hasTargetEvent: false,
                          eventName: '',
                          eventDate: '',
                          eventDistanceKm: null,
                          eventElevationM: null,
                          eventTerrainType: null,
                          eventLocation: '',
                          sports: [],
                          title: '',
                        });
                        setEventQuery('');
                      }}
                      className="text-xs text-gray-400 hover:text-red-500 transition"
                    >
                      ✕ Retirer
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {form.eventDate && (
                      <span className="text-xs bg-white rounded-full px-2.5 py-1 text-gray-600 shadow-sm">
                        📅{' '}
                        {new Date(form.eventDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                    {form.eventDistanceKm && (
                      <span className="text-xs bg-white rounded-full px-2.5 py-1 text-gray-600 shadow-sm">
                        📏 {form.eventDistanceKm} km
                      </span>
                    )}
                    {form.eventElevationM && (
                      <span className="text-xs bg-white rounded-full px-2.5 py-1 text-gray-600 shadow-sm">
                        ⛰️ {form.eventElevationM}m D+
                      </span>
                    )}
                    {form.eventTerrainType && (
                      <span className="text-xs bg-white rounded-full px-2.5 py-1 text-gray-600 shadow-sm">
                        🏔️ {TERRAIN_TYPES.find((t) => t.value === form.eventTerrainType)?.label}
                      </span>
                    )}
                  </div>

                  {/* Auto-selected sports */}
                  <div className="flex gap-1.5 flex-wrap">
                    {form.sports.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 text-xs bg-brand-100 text-brand-700 px-2.5 py-1 rounded-full font-medium"
                      >
                        {SPORT_EMOJIS[s]} {SPORT_LABELS[s]}
                      </span>
                    ))}
                  </div>

                  {/* Editable fields */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Input
                      label="Date"
                      type="date"
                      value={form.eventDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        updateForm({ eventDate: newDate });
                        if (newDate) {
                          const diffMs = new Date(newDate).getTime() - Date.now();
                          const weeks = Math.max(4, Math.ceil(diffMs / (7 * 86400000)));
                          updateForm({ eventDate: newDate, duration_weeks: weeks });
                        }
                      }}
                    />
                    <Input
                      label="Distance (km)"
                      type="number"
                      min={0}
                      value={form.eventDistanceKm ?? ''}
                      onChange={(e) =>
                        updateForm({ eventDistanceKm: e.target.value ? Number(e.target.value) : null })
                      }
                    />
                  </div>
                </div>
              )}

              {/* Or skip: programme libre */}
              {!form.hasTargetEvent && (
                <div className="text-center pt-2">
                  <div className="relative flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 font-medium">ou</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="mt-2 w-full rounded-xl border-2 border-dashed border-gray-300 p-4 text-center hover:border-brand-400 hover:bg-brand-50/30 transition-all group"
                  >
                    <span className="text-2xl block mb-1">🏋️</span>
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-brand-600">
                      Programme libre
                    </span>
                    <span className="text-xs text-gray-400 block mt-0.5">
                      Sans evenement cible
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* Step 1: Details — Sports (multi-select) + title + level          */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Sports multi-select */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Sport{form.sports.length > 1 ? 's' : ''}
                  {form.hasTargetEvent && (
                    <span className="text-xs text-gray-400 ml-2">
                      (pre-selectionne{form.sports.length > 1 ? 's' : ''} depuis l&apos;evenement)
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {SPORTS.map((s) => {
                    const selected = form.sports.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSport(s)}
                        className={`flex flex-col items-center gap-1 rounded-xl p-3 text-center transition-all ${
                          selected
                            ? 'bg-brand-50 ring-2 ring-brand-500 shadow-sm'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-2xl">{SPORT_EMOJIS[s]}</span>
                        <span className="text-[11px] font-medium text-gray-700 leading-tight">
                          {SPORT_LABELS[s]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Input
                label="Titre du programme"
                placeholder="Ex: Programme Force 8 semaines, Prepa marathon..."
                value={form.title}
                onChange={(e) => updateForm({ title: e.target.value })}
              />

              <Textarea
                label="Description (optionnel)"
                placeholder="Objectifs, public vise, materiel necessaire..."
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

              {/* Terrain (if event mode or multi-sport) */}
              {(form.hasTargetEvent || form.sports.some((s) => ['running', 'trail', 'cyclisme'].includes(s))) && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Terrain</label>
                  <div className="flex gap-2">
                    {TERRAIN_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() =>
                          updateForm({
                            eventTerrainType:
                              form.eventTerrainType === t.value ? null : t.value,
                          })
                        }
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                          form.eventTerrainType === t.value
                            ? 'bg-brand-500 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* Step 2: Duree & Tarif                                            */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Calibration from activity history */}
              {effectiveAthleteId && (
                <div className="space-y-3">
                  {!calibration && (
                    <Button
                      variant="secondary"
                      onClick={handleCalibrate}
                      disabled={calibrating}
                      className="w-full"
                    >
                      {calibrating ? 'Analyse en cours...' : 'Calibrer depuis l\'historique'}
                    </Button>
                  )}
                  {calibrationError && (
                    <p className="text-sm text-red-500">{calibrationError}</p>
                  )}
                  {calibration && calibration.dataPoints > 0 && (
                    <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-brand-700">Calibration auto</h4>
                        <span className="text-[11px] text-gray-400">
                          {calibration.dataPoints} activites analysees
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-white p-2 text-center shadow-sm">
                          <span className="text-lg font-bold text-blue-600">
                            {calibration.currentCtl}
                          </span>
                          <span className="text-[10px] block text-gray-500">Fitness (CTL)</span>
                        </div>
                        <div className="rounded-lg bg-white p-2 text-center shadow-sm">
                          <span className="text-lg font-bold text-amber-600">
                            {Math.round((calibration.weeklyVolumeMin / 60) * 10) / 10}h
                          </span>
                          <span className="text-[10px] block text-gray-500">Vol. / semaine</span>
                        </div>
                        <div className="rounded-lg bg-white p-2 text-center shadow-sm">
                          <span className="text-lg font-bold text-green-600">
                            {calibration.weeklySessionCount}
                          </span>
                          <span className="text-[10px] block text-gray-500">Seances / sem.</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                          {LEVEL_MAP[calibration.suggestedLevel] || calibration.suggestedLevel}
                        </span>
                        {calibration.primarySports.map((s) => (
                          <span
                            key={s}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                          >
                            {SPORT_LABELS[s as Sport] || s}
                          </span>
                        ))}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            calibration.currentTsb >= 0
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          TSB {calibration.currentTsb > 0 ? '+' : ''}
                          {calibration.currentTsb}
                        </span>
                      </div>
                    </div>
                  )}
                  {calibration && calibration.dataPoints === 0 && (
                    <p className="text-sm text-gray-400">
                      Aucune activite trouvee sur les 12 dernieres semaines.
                    </p>
                  )}
                </div>
              )}

              {/* Duration with auto-calc info */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Duree (semaines)
                  {form.hasTargetEvent && form.eventDate && (
                    <span className="text-xs text-brand-500 ml-2">
                      Auto-calcule depuis la date de l&apos;evenement
                    </span>
                  )}
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

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* Step 3: Preview                                                  */}
          {/* ────────────────────────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">
                Voici comment votre programme apparaitra :
              </p>

              <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div
                  className={`bg-gradient-to-r ${
                    SPORT_GRADIENT_CLASSES[primarySport as Sport] || 'from-gray-400 to-gray-500'
                  } px-5 py-4`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1">
                      {form.sports.map((s) => (
                        <span key={s} className="text-3xl">{SPORT_EMOJIS[s]}</span>
                      ))}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {form.title || 'Sans titre'}
                      </h3>
                      <p className="text-sm text-white/80">
                        {form.sports.map((s) => SPORT_LABELS[s]).join(' + ')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-3">
                  {form.description && (
                    <p className="text-sm text-gray-600">{form.description}</p>
                  )}

                  {form.hasTargetEvent && (
                    <div className="flex items-center gap-2 text-xs text-brand-600 bg-brand-50 rounded-lg px-3 py-2">
                      <span>🎯</span>
                      <span className="font-medium">{form.eventName}</span>
                      {form.eventDate && (
                        <span className="text-gray-400">
                          {new Date(form.eventDate).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
                      {LEVELS.find((l) => l.value === form.level)?.label}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
                      {form.duration_weeks} semaines
                    </span>
                    {form.eventDistanceKm && (
                      <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
                        {form.eventDistanceKm} km
                      </span>
                    )}
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

          {step < 3 ? (
            <Button onClick={handleNext} disabled={!canGoNext()} className="flex-1">
              Suivant
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading
                ? isEdit
                  ? 'Mise a jour...'
                  : 'Creation...'
                : isEdit
                  ? 'Enregistrer'
                  : 'Creer le programme'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

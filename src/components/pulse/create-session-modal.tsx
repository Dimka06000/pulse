'use client';

import { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { SPORTS, SPORT_LABELS, SPORT_EMOJIS, type Sport } from '@/lib/sports';

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  duration_minutes?: number;
}

interface CreateSessionModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  defaultDate?: string;
}

// Presets par sport — quick-start en 1 tap
const SPORT_PRESETS: Record<string, Array<{ label: string; duration: number; exercises: Exercise[] }>> = {
  musculation: [
    { label: 'Push Day', duration: 60, exercises: [
      { name: 'Developpe couche', sets: 4, reps: 10, rest_seconds: 90 },
      { name: 'Developpe incline', sets: 3, reps: 12, rest_seconds: 75 },
      { name: 'Dips', sets: 3, reps: 12, rest_seconds: 60 },
      { name: 'Extensions triceps', sets: 3, reps: 15, rest_seconds: 45 },
    ]},
    { label: 'Pull Day', duration: 60, exercises: [
      { name: 'Tractions', sets: 4, reps: 8, rest_seconds: 90 },
      { name: 'Rowing barre', sets: 4, reps: 10, rest_seconds: 75 },
      { name: 'Curl biceps', sets: 3, reps: 12, rest_seconds: 45 },
      { name: 'Face pull', sets: 3, reps: 15, rest_seconds: 45 },
    ]},
    { label: 'Leg Day', duration: 60, exercises: [
      { name: 'Squat', sets: 4, reps: 10, rest_seconds: 120 },
      { name: 'Fentes avant', sets: 3, reps: 12, rest_seconds: 60 },
      { name: 'Souleve de terre roumain', sets: 3, reps: 10, rest_seconds: 75 },
      { name: 'Mollets', sets: 4, reps: 15, rest_seconds: 45 },
    ]},
    { label: 'Full Body', duration: 75, exercises: [
      { name: 'Squat', sets: 3, reps: 10, rest_seconds: 90 },
      { name: 'Developpe couche', sets: 3, reps: 10, rest_seconds: 90 },
      { name: 'Tractions', sets: 3, reps: 8, rest_seconds: 75 },
      { name: 'Gainage planche', sets: 3, reps: 1, rest_seconds: 45, duration_minutes: 1 },
    ]},
  ],
  running: [
    { label: 'Footing facile', duration: 40, exercises: [
      { name: 'Footing endurance', sets: 1, reps: 1, rest_seconds: 0, duration_minutes: 40 },
    ]},
    { label: 'Fractionne 30/30', duration: 45, exercises: [
      { name: 'Echauffement', sets: 1, reps: 1, rest_seconds: 0, duration_minutes: 10 },
      { name: 'Sprint 30s', sets: 10, reps: 1, rest_seconds: 30 },
      { name: 'Retour au calme', sets: 1, reps: 1, rest_seconds: 0, duration_minutes: 10 },
    ]},
    { label: 'Sortie longue', duration: 90, exercises: [
      { name: 'Course endurance', sets: 1, reps: 1, rest_seconds: 0, duration_minutes: 90 },
    ]},
    { label: 'Tempo run', duration: 50, exercises: [
      { name: 'Echauffement', sets: 1, reps: 1, rest_seconds: 0, duration_minutes: 10 },
      { name: 'Course tempo', sets: 3, reps: 1, rest_seconds: 120, duration_minutes: 8 },
      { name: 'Retour au calme', sets: 1, reps: 1, rest_seconds: 0, duration_minutes: 5 },
    ]},
  ],
  crossfit: [
    { label: 'WOD du jour', duration: 45, exercises: [
      { name: 'Burpees', sets: 3, reps: 15, rest_seconds: 60 },
      { name: 'Box jumps', sets: 3, reps: 12, rest_seconds: 60 },
      { name: 'Thrusters', sets: 3, reps: 10, rest_seconds: 60 },
      { name: 'Wall balls', sets: 3, reps: 15, rest_seconds: 60 },
    ]},
    { label: 'AMRAP 20 min', duration: 30, exercises: [
      { name: 'AMRAP Pompes + Squats + Tractions', sets: 1, reps: 1, rest_seconds: 0, duration_minutes: 20 },
    ]},
  ],
  yoga: [
    { label: 'Flow 30 min', duration: 30, exercises: [
      { name: 'Salutation au soleil', sets: 5, reps: 1, rest_seconds: 15, duration_minutes: 2 },
      { name: 'Guerrier I + II', sets: 2, reps: 1, rest_seconds: 10, duration_minutes: 3 },
      { name: 'Etirement final', sets: 1, reps: 1, rest_seconds: 0, duration_minutes: 5 },
    ]},
    { label: 'Stretching recovery', duration: 20, exercises: [
      { name: 'Etirement ischio-jambiers', sets: 2, reps: 1, rest_seconds: 15, duration_minutes: 1 },
      { name: 'Etirement quadriceps', sets: 2, reps: 1, rest_seconds: 15, duration_minutes: 1 },
      { name: 'Etirement hanches', sets: 2, reps: 1, rest_seconds: 15, duration_minutes: 1 },
      { name: 'Gainage planche', sets: 2, reps: 1, rest_seconds: 30, duration_minutes: 1 },
    ]},
  ],
  natation: [
    { label: 'Technique crawl', duration: 45, exercises: [
      { name: 'Echauffement 200m', sets: 1, reps: 1, rest_seconds: 30, duration_minutes: 5 },
      { name: 'Series 100m', sets: 6, reps: 1, rest_seconds: 30, duration_minutes: 2 },
      { name: 'Educatifs', sets: 4, reps: 1, rest_seconds: 20, duration_minutes: 3 },
    ]},
  ],
  cyclisme: [
    { label: 'Sortie endurance', duration: 90, exercises: [
      { name: 'Velo zone 2', sets: 1, reps: 1, rest_seconds: 0, duration_minutes: 90 },
    ]},
    { label: 'Intervalles', duration: 60, exercises: [
      { name: 'Echauffement velo', sets: 1, reps: 1, rest_seconds: 0, duration_minutes: 15 },
      { name: 'Intervalle 3 min haute intensite', sets: 5, reps: 1, rest_seconds: 180, duration_minutes: 3 },
      { name: 'Retour au calme', sets: 1, reps: 1, rest_seconds: 0, duration_minutes: 10 },
    ]},
  ],
};

// ── Smart date/time helpers ─────────────────────────────────────────────────

const DAY_NAMES_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTH_NAMES = ['jan', 'fev', 'mar', 'avr', 'mai', 'juin', 'juil', 'aout', 'sept', 'oct', 'nov', 'dec'];

function getNextDays(count: number) {
  const days = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const label = i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain' : `${DAY_NAMES_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
    days.push({ date: d, label, value: d.toISOString().split('T')[0] });
  }
  return days;
}

type TimePeriod = 'matin' | 'midi' | 'soir';
const TIME_PERIODS: Array<{ key: TimePeriod; label: string; emoji: string; slots: string[] }> = [
  { key: 'matin', label: 'Matin', emoji: '🌅', slots: ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00'] },
  { key: 'midi', label: 'Midi', emoji: '☀️', slots: ['11:30', '12:00', '12:30', '13:00', '13:30', '14:00'] },
  { key: 'soir', label: 'Soir', emoji: '🌙', slots: ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'] },
];

const QUICK_EXERCISES: Record<string, string[]> = {
  musculation: ['Squat', 'Developpe couche', 'Tractions', 'Curl biceps', 'Dips', 'Fentes', 'Gainage planche'],
  crossfit: ['Burpees', 'Box jumps', 'Thrusters', 'Wall balls', 'Toes to bar', 'Clean & jerk'],
  yoga: ['Salutation au soleil', 'Guerrier I', 'Guerrier II', 'Chien tete en bas', 'Planche'],
  running: ['Footing', 'Fractionne', 'Cotes', 'Tempo', 'Recuperation'],
  cyclisme: ['Sortie endurance', 'Intervalles', 'Cotes', 'Tempo'],
  natation: ['Crawl continu', 'Series 100m', 'Dos', 'Educatifs'],
  boxe: ['Shadow boxing', 'Sac lourd', 'Corde a sauter', 'Sparring'],
  fitness: ['Gainage', 'Pompes', 'Abdos', 'Mountain climbers'],
};

// Sport accent colors
const SPORT_COLORS: Record<string, string> = {
  running: '#3b82f6', trail: '#10b981', triathlon: '#0ea5e9', crossfit: '#ef4444',
  musculation: '#10b981', cyclisme: '#14b8a6', natation: '#0ea5e9', yoga: '#8b5cf6',
  boxe: '#f59e0b', fitness: '#f97316', pilates: '#a78bfa', meditation: '#6366f1',
};

function CreateSessionModal({ open, onClose, onCreated, defaultDate }: CreateSessionModalProps) {
  const [step, setStep] = useState<'sport' | 'config'>('sport');
  const [sport, setSport] = useState('');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('60');
  const [scheduledAt, setScheduledAt] = useState(defaultDate || '');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('matin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nextDays = getNextDays(10);

  if (!open) return null;

  const accent = SPORT_COLORS[sport] || '#6b7280';
  const presets = sport ? (SPORT_PRESETS[sport] || []) : [];
  const quickList = sport ? (QUICK_EXERCISES[sport] || QUICK_EXERCISES.fitness || []) : [];

  const selectSport = (s: string) => {
    setSport(s);
    setExercises([]);
    setTitle('');
    setStep('config');
    // Auto-detect best time period based on current hour
    const hour = new Date().getHours();
    if (hour < 11) { setTimePeriod('matin'); setSelectedTime('07:00'); }
    else if (hour < 15) { setTimePeriod('midi'); setSelectedTime('12:00'); }
    else { setTimePeriod('soir'); setSelectedTime('18:00'); }
  };

  const selectPreset = (preset: typeof presets[0]) => {
    setTitle(preset.label);
    setDuration(String(preset.duration));
    setExercises(preset.exercises);
  };

  const addExercise = (name: string) => {
    setExercises(prev => [...prev, { name, sets: 3, reps: 10, rest_seconds: 60 }]);
  };

  const removeExercise = (idx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const updateExercise = (idx: number, field: keyof Exercise, value: number) => {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const reset = () => {
    setSport('');
    setTitle('');
    setDuration('60');
    setScheduledAt(defaultDate || '');
    setSelectedDay(new Date().toISOString().split('T')[0]);
    setSelectedTime('');
    setTimePeriod('matin');
    setNotes('');
    setExercises([]);
    setStep('sport');
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    if (!sport || !duration || !selectedDay || !selectedTime) {
      setError('Choisissez un jour et un creneau');
      return;
    }

    const scheduledDate = `${selectedDay}T${selectedTime}:00`;

    setLoading(true);
    try {
      const res = await fetch('/api/solo-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport,
          title: title || `${SPORT_LABELS[sport as Sport]} solo`,
          duration_minutes: parseInt(duration, 10),
          scheduled_at: new Date(scheduledDate).toISOString(),
          notes,
          metrics: exercises.length > 0 ? { exercises } : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }

      await fetch('/api/streaks', { method: 'POST' }).catch(() => {});
      reset();
      onCreated?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { reset(); onClose(); }} />

      <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        {/* ── Step 1: Choix du sport ─────────────────────────────────── */}
        {step === 'sport' && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Nouvelle seance</h2>
              <button onClick={() => { reset(); onClose(); }}
                className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition">
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">Quel sport aujourd&apos;hui ?</p>

            <div className="grid grid-cols-3 gap-2">
              {SPORTS.filter(s => s !== 'autre').map((s) => (
                <button
                  key={s}
                  onClick={() => selectSport(s)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 p-3 hover:border-brand-300 hover:bg-brand-50/30 transition-all group"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">{SPORT_EMOJIS[s]}</span>
                  <span className="text-[11px] font-medium text-gray-700 leading-tight text-center">
                    {SPORT_LABELS[s]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Configuration ──────────────────────────────────── */}
        {step === 'config' && (
          <div>
            {/* Header with sport */}
            <div className="px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setStep('sport')}
                    className="text-sm text-gray-400 hover:text-gray-600 transition">
                    ←
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{SPORT_EMOJIS[sport as Sport]}</span>
                    <span className="font-bold text-gray-900">{SPORT_LABELS[sport as Sport]}</span>
                  </div>
                </div>
                <button onClick={() => { reset(); onClose(); }}
                  className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Presets — 1 tap pour tout remplir */}
              {presets.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Seances rapides
                  </p>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {presets.map((p) => {
                      const isActive = title === p.label;
                      return (
                        <button
                          key={p.label}
                          onClick={() => selectPreset(p)}
                          className={`flex-shrink-0 rounded-xl px-4 py-2.5 text-left transition-all border ${
                            isActive
                              ? 'border-transparent text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}
                          style={isActive ? { background: accent } : {}}
                        >
                          <span className="text-sm font-semibold block">{p.label}</span>
                          <span className={`text-[11px] ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                            {p.duration} min · {p.exercises.length} exo
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── QUAND ? — Day picker ────────────────────────────────── */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quel jour ?</p>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {nextDays.map((d) => {
                    const isActive = selectedDay === d.value;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setSelectedDay(d.value)}
                        className={`flex-shrink-0 rounded-xl px-3 py-2 text-center transition-all border min-w-[72px] ${
                          isActive
                            ? 'border-transparent text-white shadow-sm'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                        style={isActive ? { background: accent } : {}}
                      >
                        <span className="text-[11px] font-semibold block leading-tight">{d.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── QUELLE HEURE ? — Period tabs + time grid ──────────── */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">A quelle heure ?</p>
                {/* Period tabs */}
                <div className="flex gap-1.5 mb-3">
                  {TIME_PERIODS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setTimePeriod(p.key)}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition border ${
                        timePeriod === p.key
                          ? 'border-transparent text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                      style={timePeriod === p.key ? { background: accent } : {}}
                    >
                      {p.emoji} {p.label}
                    </button>
                  ))}
                </div>
                {/* Time slots grid */}
                <div className="flex flex-wrap gap-1.5">
                  {TIME_PERIODS.find(p => p.key === timePeriod)?.slots.map((slot) => {
                    const isActive = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={`rounded-lg px-3 py-2 text-xs font-mono font-semibold transition border ${
                          isActive
                            ? 'border-transparent text-white shadow-sm'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                        style={isActive ? { background: accent } : {}}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── COMBIEN DE TEMPS ? — Duration pills ──────────────── */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Combien de temps ?</p>
                <div className="flex gap-2">
                  {[20, 30, 45, 60, 90, 120].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(String(d))}
                      className={`flex-1 rounded-xl py-2.5 text-center transition border ${
                        duration === String(d)
                          ? 'border-transparent text-white shadow-sm'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                      style={duration === String(d) ? { background: accent } : {}}
                    >
                      <span className="text-sm font-bold block">{d >= 60 ? `${d / 60}h` : d}</span>
                      {d < 60 && <span className="text-[10px] opacity-70">min</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <Input
                label="Titre"
                placeholder={`${SPORT_LABELS[sport as Sport]} du ${new Date().toLocaleDateString('fr-FR', { weekday: 'long' })}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              {/* Exercises */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Exercices</label>
                  <span className="text-[11px] text-gray-400">{exercises.length} exercice{exercises.length > 1 ? 's' : ''}</span>
                </div>

                {/* Exercise list */}
                {exercises.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {exercises.map((ex, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                        <span className="text-xs font-semibold text-gray-900 flex-1 truncate">{ex.name}</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 shrink-0">
                          {ex.duration_minutes ? (
                            <span>{ex.sets > 1 ? `${ex.sets}×` : ''}{ex.duration_minutes}min</span>
                          ) : (
                            <span>{ex.sets}×{ex.reps}</span>
                          )}
                          <span className="text-gray-300">·</span>
                          <span>{ex.rest_seconds}s</span>
                        </div>
                        <button onClick={() => removeExercise(i)}
                          className="text-gray-300 hover:text-red-500 transition text-xs ml-1">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick add chips */}
                <div className="flex flex-wrap gap-1.5">
                  {quickList.map(name => {
                    const added = exercises.some(e => e.name === name);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => !added && addExercise(name)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition border ${
                          added
                            ? 'border-transparent text-white'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                        }`}
                        style={added ? { background: accent } : {}}
                      >
                        {added ? '✓' : '+'} {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <Textarea
                label="Notes"
                placeholder="Objectif, sensations..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              {error && <p className="text-sm text-red-500">{error}</p>}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="secondary" onClick={() => { reset(); onClose(); }} className="flex-1">
                  Annuler
                </Button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !scheduledAt}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
                  style={{ background: accent }}
                >
                  {loading ? 'Creation...' : exercises.length > 0 ? 'Creer et lancer' : 'Creer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { CreateSessionModal };

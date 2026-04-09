'use client';

import { useState } from 'react';
import { Button } from './button';

const FACE_EMOJIS = ['😫', '😟', '😐', '🙂', '😁'];

interface JournalData {
  date: string;
  sleep_hours: number;
  sleep_quality: number;
  energy_level: number;
  stress_level: number;
  mood: number;
  alcohol: boolean;
  caffeine_cups: number;
  supplements: string[];
  notes: string;
}

interface JournalEntryFormProps {
  initialData?: Partial<JournalData>;
  date: string;
  onSave: (data: JournalData) => Promise<void>;
}

function EmojiScale({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-text">{label}</p>
      <div className="flex gap-1">
        {FACE_EMOJIS.map((emoji, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i + 1)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all ${
              value === i + 1
                ? 'bg-brand-500/10 ring-2 ring-brand-500 scale-110'
                : 'bg-surface hover:bg-surface/80'
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export function JournalEntryForm({ initialData, date, onSave }: JournalEntryFormProps) {
  const [sleepHours, setSleepHours] = useState(initialData?.sleep_hours ?? 7);
  const [sleepQuality, setSleepQuality] = useState(initialData?.sleep_quality ?? 3);
  const [energy, setEnergy] = useState(initialData?.energy_level ?? 3);
  const [stress, setStress] = useState(initialData?.stress_level ?? 3);
  const [mood, setMood] = useState(initialData?.mood ?? 3);
  const [alcohol, setAlcohol] = useState(initialData?.alcohol ?? false);
  const [caffeine, setCaffeine] = useState(initialData?.caffeine_cups ?? 0);
  const [supplements, setSupplements] = useState<string[]>(initialData?.supplements ?? []);
  const [suppInput, setSuppInput] = useState('');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        date,
        sleep_hours: sleepHours,
        sleep_quality: sleepQuality,
        energy_level: energy,
        stress_level: stress,
        mood,
        alcohol,
        caffeine_cups: caffeine,
        supplements,
        notes,
      });
    } finally {
      setSaving(false);
    }
  };

  const addSupplement = () => {
    const val = suppInput.trim();
    if (val && !supplements.includes(val)) {
      setSupplements([...supplements, val]);
      setSuppInput('');
    }
  };

  return (
    <div className="space-y-5">
      {/* Sleep hours slider */}
      <div>
        <p className="mb-1.5 text-xs font-semibold text-text">Sommeil</p>
        <div className="flex items-center gap-3">
          <span className="text-lg">🛌</span>
          <input
            type="range"
            min={0}
            max={12}
            step={0.5}
            value={sleepHours}
            onChange={e => setSleepHours(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-surface accent-brand-500"
          />
          <span className="min-w-[3rem] text-right text-sm font-bold text-text">{sleepHours}h</span>
        </div>
      </div>

      {/* Quality scales */}
      <EmojiScale label="Qualite du sommeil" value={sleepQuality} onChange={setSleepQuality} />
      <EmojiScale label="Energie" value={energy} onChange={setEnergy} />
      <EmojiScale label="Stress" value={stress} onChange={setStress} />
      <EmojiScale label="Humeur" value={mood} onChange={setMood} />

      {/* Alcohol toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍷</span>
          <span className="text-xs font-semibold text-text">Alcool</span>
        </div>
        <button
          type="button"
          onClick={() => setAlcohol(!alcohol)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            alcohol ? 'bg-brand-500' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              alcohol ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Caffeine */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">☕</span>
          <span className="text-xs font-semibold text-text">Cafes</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCaffeine(Math.max(0, caffeine - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-sm font-bold"
          >
            -
          </button>
          <span className="min-w-[2rem] text-center text-sm font-bold text-text">{caffeine}</span>
          <button
            type="button"
            onClick={() => setCaffeine(caffeine + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-sm font-bold"
          >
            +
          </button>
        </div>
      </div>

      {/* Supplements */}
      <div>
        <p className="mb-1.5 text-xs font-semibold text-text">Supplements</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={suppInput}
            onChange={e => setSuppInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSupplement())}
            placeholder="ex: Vitamine D, Omega 3..."
            className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/50"
          />
          <Button variant="secondary" size="sm" onClick={addSupplement}>+</Button>
        </div>
        {supplements.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {supplements.map(s => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-600"
              >
                {s}
                <button
                  type="button"
                  onClick={() => setSupplements(supplements.filter(x => x !== s))}
                  className="ml-0.5 text-brand-400 hover:text-red-500"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <p className="mb-1.5 text-xs font-semibold text-text">Notes</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Comment s'est passee votre journee ?"
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
        />
      </div>

      <Button variant="primary" size="lg" className="w-full" loading={saving} onClick={handleSave}>
        Enregistrer
      </Button>
    </div>
  );
}

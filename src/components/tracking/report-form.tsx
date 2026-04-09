'use client';

import { useState } from 'react';

interface ReportFormProps {
  bookingId: string;
  clientName: string;
  onSubmit: (data: {
    bookingId: string;
    coachNotes: string;
    athleteProgress: Array<{ metric: string; value: number; unit: string; label: string }>;
    nextSessionFocus: string;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ReportForm({ bookingId, clientName, onSubmit, onCancel, loading }: ReportFormProps) {
  const [coachNotes, setCoachNotes] = useState('');
  const [nextSessionFocus, setNextSessionFocus] = useState('');
  const [weight, setWeight] = useState('');
  const [performance, setPerformance] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const progress: Array<{ metric: string; value: number; unit: string; label: string }> = [];
    if (weight) {
      progress.push({ metric: 'weight', value: parseFloat(weight), unit: 'kg', label: 'Poids' });
    }
    if (performance) {
      progress.push({ metric: 'performance', value: parseFloat(performance), unit: 'pts', label: 'Performance' });
    }

    await onSubmit({
      bookingId,
      coachNotes,
      athleteProgress: progress,
      nextSessionFocus,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Notes sur la séance avec {clientName}
        </label>
        <textarea
          value={coachNotes}
          onChange={(e) => setCoachNotes(e.target.value)}
          placeholder="Comment s'est passée la séance ? Énergie, motivation, progrès observés..."
          rows={4}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Poids (kg) — optionnel
          </label>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="72.5"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Performance (1-10) — optionnel
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={performance}
            onChange={(e) => setPerformance(e.target.value)}
            placeholder="7"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Focus pour la prochaine séance
        </label>
        <textarea
          value={nextSessionFocus}
          onChange={(e) => setNextSessionFocus(e.target.value)}
          placeholder="Sur quoi travailler la prochaine fois..."
          rows={2}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer le rapport'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

'use client';

import { useState } from 'react';

interface EndorseButtonProps {
  endorseeId: string;
  endorseeSpecialties: string[];
  mySpecialties: string[];          // Current user's specialties (to filter endorsable)
  myExistingEndorsements: string[]; // Specialties I've already endorsed for this coach
}

export function EndorseButton({
  endorseeId,
  endorseeSpecialties,
  mySpecialties,
  myExistingEndorsements,
}: EndorseButtonProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Only show specialties I also practice AND haven't already endorsed
  const endorsable = endorseeSpecialties.filter(
    (s) =>
      mySpecialties.some((ms) => ms.toLowerCase() === s.toLowerCase()) &&
      !myExistingEndorsements.some((e) => e.toLowerCase() === s.toLowerCase()),
  );

  if (endorsable.length === 0) return null;

  const handleEndorse = async (specialty: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/endorsements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endorseeId, specialty }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Erreur');
      }
      setShowPicker(false);
      // Refresh page to show updated endorsements
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-sm text-brand-700 hover:bg-brand-100"
      >
        Recommander
      </button>

      {showPicker && (
        <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
          <p className="px-2 py-1 text-xs text-gray-500">Choisir une spécialité</p>
          {endorsable.map((s) => (
            <button
              key={s}
              onClick={() => handleEndorse(s)}
              disabled={loading}
              className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
          {error && <p className="px-2 py-1 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

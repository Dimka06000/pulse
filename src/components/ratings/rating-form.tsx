'use client';

import { useState } from 'react';
import { useSocialStore } from '@/stores/social';

interface RatingFormProps {
  bookingId: string;
  coachAcceptsAnonymous: boolean;
  onSuccess: () => void;
}

export function RatingForm({ bookingId, coachAcceptsAnonymous, onSuccess }: RatingFormProps) {
  const { submitRating } = useSocialStore();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (score === 0) {
      setError('Veuillez donner une note');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await submitRating({ bookingId, score, comment, isAnonymous });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">Évaluer la session</h3>

      {/* Star rating */}
      <div>
        <p className="text-sm font-medium text-gray-700">Note</p>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setScore(star)}
              className="text-3xl transition-transform hover:scale-110"
              aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
            >
              {star <= score ? (
                <span className="text-yellow-400">&#9733;</span>
              ) : (
                <span className="text-gray-300">&#9733;</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Commentaire</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[80px] resize-y"
          placeholder="Partagez votre expérience..."
        />
      </div>

      {coachAcceptsAnonymous && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="rounded"
          />
          Publier anonymement
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading || score === 0}
        className="w-full rounded-lg bg-brand-600 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? 'Envoi...' : 'Publier'}
      </button>
    </form>
  );
}

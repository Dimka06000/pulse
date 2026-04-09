'use client';

import { useState } from 'react';
import { useSocialStore } from '@/stores/social';

interface CoachReplyFormProps {
  ratingId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CoachReplyForm({ ratingId, onClose, onSuccess }: CoachReplyFormProps) {
  const { replyToRating } = useSocialStore();
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setLoading(true);
    setError('');
    try {
      await replyToRating(ratingId, reply);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[60px] resize-y"
        placeholder="Votre réponse..."
        autoFocus
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading || !reply.trim()}
          className="rounded-lg bg-brand-600 px-3 py-1 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? 'Envoi...' : 'Répondre'}
        </button>
      </div>
    </form>
  );
}

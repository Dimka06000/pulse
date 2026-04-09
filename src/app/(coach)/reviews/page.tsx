'use client';

import { useEffect, useState } from 'react';
import { useSocialStore } from '@/stores/social';
import { RatingCard } from '@/components/ratings/rating-card';
import { RatingStats } from '@/components/ratings/rating-stats';
import { CoachReplyForm } from '@/components/ratings/coach-reply-form';

export default function ReviewsPage() {
  const { ratings, ratingsLoading, fetchRatings } = useSocialStore();
  const [coachId, setCoachId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Fetch coach profile ID first
  useEffect(() => {
    async function loadCoach() {
      const res = await fetch('/api/coaches/me');
      if (res.ok) {
        const data = await res.json();
        setCoachId(data.id);
      }
    }
    loadCoach();
  }, []);

  useEffect(() => {
    if (coachId) {
      fetchRatings(coachId);
    }
  }, [coachId, fetchRatings]);

  if (ratingsLoading && !ratings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  const stats = ratings?.stats as Record<string, unknown> | null;
  const ratingList = (ratings?.ratings as Record<string, unknown>[]) ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900">Avis clients</h1>

      {/* Stats */}
      {stats && (
        <div className="mt-4">
          <RatingStats
            avgRating={stats.avgRating as number}
            totalRatings={stats.totalRatings as number}
            distribution={stats.distribution as Record<number, number>}
          />
        </div>
      )}

      {/* Rating list */}
      {ratingList.length === 0 ? (
        <div className="mt-8 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
          <p className="text-gray-500">Aucun avis pour le moment</p>
          <p className="mt-1 text-sm text-gray-400">
            Les sportifs pourront vous évaluer après leurs sessions
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {ratingList.map((r) => (
            <div key={r.id as string}>
              <RatingCard
                ratingId={r.id as string}
                athleteName={r.athleteName as string | null}
                score={r.score as number}
                comment={(r.comment as string) ?? ''}
                isAnonymous={false}
                coachReply={(r.coachReply as string | null) ?? null}
                bookingDate={r.bookingDate as string}
                sessionTitle={r.sessionTitle as string}
                isCoachView={true}
                onReply={setReplyingTo}
              />
              {replyingTo === (r.id as string) && (
                <CoachReplyForm
                  ratingId={r.id as string}
                  onClose={() => setReplyingTo(null)}
                  onSuccess={() => {
                    setReplyingTo(null);
                    if (coachId) fetchRatings(coachId);
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

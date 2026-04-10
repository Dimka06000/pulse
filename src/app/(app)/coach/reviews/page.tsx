'use client';

import { useEffect, useState } from 'react';
import { useSocialStore } from '@/stores/social';
import { RatingCard } from '@/components/ratings/rating-card';
import { RatingStats } from '@/components/ratings/rating-stats';
import { CoachReplyForm } from '@/components/ratings/coach-reply-form';
import { Skeleton } from '@/components/pulse/skeleton';
import { EmptyState } from '@/components/pulse/empty-state';
import { useRouter } from 'next/navigation';

export default function ReviewsPage() {
  const router = useRouter();
  const { ratings, ratingsLoading, fetchRatings } = useSocialStore();
  const [coachId, setCoachId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // Timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Fetch coach profile ID first
  useEffect(() => {
    async function loadCoach() {
      try {
        const res = await fetch('/api/coaches/me');
        if (res.ok) {
          const data = await res.json();
          setCoachId(data.id);
        } else {
          setLoadError(true);
        }
      } catch {
        setLoadError(true);
      }
    }
    loadCoach();
  }, []);

  useEffect(() => {
    if (coachId) {
      fetchRatings(coachId);
    }
  }, [coachId, fetchRatings]);

  const isLoading = (ratingsLoading && !ratings) || (!coachId && !loadError && !timedOut);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (loadError || (timedOut && !coachId)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-2xl font-bold text-text mb-6">Avis clients</h1>
        <EmptyState
          icon="⚠️"
          title="Impossible de charger les avis"
          description="Vérifiez votre connexion ou votre profil coach et réessayez."
          actionLabel="Réessayer"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  const stats = ratings?.stats as Record<string, unknown> | null;
  const ratingList = (ratings?.ratings as Record<string, unknown>[]) ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold text-text">Avis clients</h1>

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
        <div className="mt-6">
          <EmptyState
            icon="⭐"
            title="Aucun avis pour le moment"
            description="Les sportifs pourront vous évaluer après leurs séances. Partagez votre profil pour recevoir vos premiers avis !"
            actionLabel="Voir mes séances"
            onAction={() => router.push('/coach/sessions')}
          />
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

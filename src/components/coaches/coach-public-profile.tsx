'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/star-rating';
import { api } from '@/lib/api';

interface CoachProfileData {
  id: string;
  userId: string;
  bio: string;
  specialties: string[];
  certifications: unknown[];
  hourlyRate: number;
  isVerified: boolean;
  avgRating: number;
  totalSessions: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  city: string | null;
  ratings: Array<{
    id: string;
    score: number;
    comment: string;
    is_anonymous: boolean;
    coach_reply: string | null;
    created_at: string;
  }>;
  endorsements: Array<{
    id: string;
    specialty: string;
  }>;
  sessionTemplates: Array<{
    id: string;
    title: string;
    sport: string;
    level: string;
    type: string;
    duration: number;
    price: number;
    max_participants: number;
  }>;
}

export function CoachPublicProfile({ coachId }: { coachId: string }) {
  const [coach, setCoach] = useState<CoachProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<CoachProfileData>(`/api/coaches/${coachId}`)
      .then(setCoach)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [coachId]);

  if (loading) return <div className="animate-pulse text-gray-400">Chargement...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!coach) return <div className="text-gray-500">Coach introuvable</div>;

  const name = [coach.firstName, coach.lastName].filter(Boolean).join(' ') || 'Coach';

  // Count endorsements per specialty
  const endorsementMap: Record<string, number> = {};
  for (const e of coach.endorsements) {
    endorsementMap[e.specialty] = (endorsementMap[e.specialty] ?? 0) + 1;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-start gap-5">
        <div className="h-20 w-20 shrink-0 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden">
          {coach.avatarUrl ? (
            <img src={coach.avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl font-semibold text-brand-600">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">{name}</h1>
            {coach.isVerified && (
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                Verifie
              </span>
            )}
          </div>
          {coach.city && <p className="text-gray-500">{coach.city}</p>}
          <div className="mt-1 flex items-center gap-3">
            <StarRating rating={coach.avgRating} showValue />
            <span className="text-sm text-gray-500">
              {coach.totalSessions} seance{coach.totalSessions !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {coach.hourlyRate > 0 ? `${coach.hourlyRate}€/h` : 'Tarif sur demande'}
          </p>
        </div>
      </div>

      {/* Bio */}
      {coach.bio && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900">A propos</h2>
          <p className="mt-2 text-gray-600 whitespace-pre-line">{coach.bio}</p>
        </section>
      )}

      {/* Specialties with endorsement counts */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Specialites</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {coach.specialties.map((s) => (
            <Badge key={s} variant={endorsementMap[s] ? 'success' : 'default'}>
              {s}
              {endorsementMap[s] ? ` · ${endorsementMap[s]} validation${endorsementMap[s] > 1 ? 's' : ''}` : ''}
            </Badge>
          ))}
        </div>
      </section>

      {/* Session templates */}
      {coach.sessionTemplates.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900">Seances proposees</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {coach.sessionTemplates.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-gray-200 p-4"
              >
                <h3 className="font-medium text-gray-900">{t.title}</h3>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-gray-500">
                  <span>{t.sport}</span>
                  <span>·</span>
                  <span>{t.duration} min</span>
                  <span>·</span>
                  <span className="capitalize">{t.type}</span>
                  {t.level !== 'all' && (
                    <>
                      <span>·</span>
                      <span className="capitalize">{t.level}</span>
                    </>
                  )}
                </div>
                <p className="mt-2 text-lg font-semibold text-gray-900">{t.price}€</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ratings */}
      {coach.ratings.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Avis ({coach.ratings.length})
          </h2>
          <div className="mt-3 space-y-4">
            {coach.ratings.map((r) => (
              <div key={r.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <StarRating rating={r.score} size="sm" />
                  <span className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-2 text-sm text-gray-600">{r.comment}</p>
                )}
                {r.is_anonymous && (
                  <p className="mt-1 text-xs text-gray-400 italic">Avis anonyme</p>
                )}
                {r.coach_reply && (
                  <div className="mt-3 border-l-2 border-brand-300 pl-3">
                    <p className="text-xs font-medium text-gray-500">Reponse du coach</p>
                    <p className="text-sm text-gray-600">{r.coach_reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

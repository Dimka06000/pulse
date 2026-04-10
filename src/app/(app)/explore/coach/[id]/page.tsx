'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppHeader } from '@/components/pulse/app-header';
import { Badge } from '@/components/pulse/badge';
import { Button } from '@/components/pulse/button';
import { SportGradient } from '@/components/pulse/sport-gradient';
import { EmptyState } from '@/components/pulse/empty-state';
import Link from 'next/link';

export default function CoachProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [coach, setCoach] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/coaches/${id}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/coaches/${id}/sessions`).then(r => r.ok ? r.json() : { sessions: [] }),
      fetch(`/api/coaches/${id}/ratings`).then(r => r.ok ? r.json() : { ratings: [] }),
    ]).then(([c, s, r]) => {
      setCoach(c);
      setSessions(s?.sessions || s || []);
      setRatings(r?.ratings || r || []);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <AppHeader title="Coach" />
        <div className="p-4 md:p-8 space-y-4">
          <div className="h-40 animate-pulse rounded-2xl bg-surface" />
          <div className="h-24 animate-pulse rounded-2xl bg-surface" />
        </div>
      </>
    );
  }

  if (!coach) {
    return (
      <>
        <AppHeader title="Coach" />
        <div className="p-4 md:p-8">
          <EmptyState icon="🔍" title="Coach introuvable" description="Ce profil n'existe pas ou a été supprimé." />
        </div>
      </>
    );
  }

  const specialties: string[] = coach.specialties || [];
  const mainSport = (specialties[0] || 'autre').toLowerCase();

  return (
    <>
      <AppHeader title={`${coach.firstName || ''} ${coach.lastName || ''}`} />
      <div className="pb-24">
        {/* Header gradient */}
        <SportGradient sport={mainSport} className="px-5 py-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 text-2xl font-bold">
              {(coach.firstName?.[0] || '?')}{(coach.lastName?.[0] || '')}
            </div>
            <div>
              <h1 className="text-xl font-bold">{coach.firstName} {coach.lastName}</h1>
              <p className="text-sm opacity-80">{specialties.join(' · ')}</p>
            </div>
            {coach.isVerified && <Badge variant="verified" className="ml-auto">✓ Vérifié</Badge>}
          </div>
        </SportGradient>

        <div className="p-4 md:p-8 space-y-6">
          {/* Stats */}
          <div className="flex justify-around rounded-2xl border border-border bg-white p-4">
            <div className="text-center">
              <p className="font-mono text-2xl font-bold text-text">{coach.avgRating?.toFixed(1) || '—'}</p>
              <p className="text-xs text-muted">★ Note</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-2xl font-bold text-text">{coach.totalSessions || 0}</p>
              <p className="text-xs text-muted">séances</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-2xl font-bold text-text">{coach.hourlyRate || '—'}€</p>
              <p className="text-xs text-muted">/heure</p>
            </div>
          </div>

          {/* Bio */}
          {coach.bio && (
            <div>
              <h2 className="mb-2 text-sm font-bold text-text">À propos</h2>
              <p className="text-sm text-muted leading-relaxed">{coach.bio}</p>
            </div>
          )}

          {/* Sessions */}
          {Array.isArray(sessions) && sessions.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-bold text-text">Séances proposées</h2>
              <div className="space-y-2">
                {sessions.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-white p-4">
                    <div>
                      <p className="text-sm font-semibold text-text">{s.title}</p>
                      <p className="text-xs text-muted">{s.duration} min · {s.sport} · {s.level}</p>
                    </div>
                    <p className="font-mono font-bold text-text">{s.price}€</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ratings */}
          {Array.isArray(ratings) && ratings.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-bold text-text">Avis ({ratings.length})</h2>
              <div className="space-y-3">
                {ratings.slice(0, 5).map((r: any) => (
                  <div key={r.id} className="rounded-xl border border-border bg-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-amber-500">{'★'.repeat(r.score)}{'☆'.repeat(5 - r.score)}</span>
                      <span className="text-xs text-muted">{r.athleteName || 'Anonyme'}</span>
                    </div>
                    {r.comment && <p className="text-sm text-muted">{r.comment}</p>}
                    {r.coachReply && (
                      <div className="mt-2 rounded-lg bg-surface p-3">
                        <p className="text-xs font-semibold text-text">Réponse du coach</p>
                        <p className="text-xs text-muted">{r.coachReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky CTA */}
        <div className="fixed bottom-16 left-0 right-0 p-4 md:bottom-0 md:left-60">
          <Link href={`/explore/coach/${id}/book`}>
            <Button variant="primary" size="lg" className="w-full">
              Réserver une séance
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}

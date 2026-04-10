'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppHeader } from '@/components/pulse/app-header';
import { Badge } from '@/components/pulse/badge';
import { Button } from '@/components/pulse/button';
import { SportGradient } from '@/components/pulse/sport-gradient';
import { EmptyState } from '@/components/pulse/empty-state';
import { SPORT_EMOJIS, type Sport } from '@/lib/sports';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/events/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(setEvent)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <AppHeader title="Événement" />
        <div className="p-4 md:p-8 space-y-4">
          <div className="h-40 animate-pulse rounded-2xl bg-surface" />
        </div>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <AppHeader title="Événement" />
        <div className="p-4 md:p-8">
          <EmptyState icon="🎪" title="Événement introuvable" description="Cet événement n'existe pas ou a été supprimé." />
        </div>
      </>
    );
  }

  const sport = (event.sport || 'autre').toLowerCase();
  const emoji = SPORT_EMOJIS[sport as Sport] || '⚡';

  return (
    <>
      <AppHeader title={event.title} />
      <div className="pb-24">
        <SportGradient sport={sport} className="px-5 py-8 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/8" />
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
            {emoji} {event.sport} · {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="mt-2 text-2xl font-bold">{event.title}</h1>
          {event.address && <p className="mt-1 text-sm opacity-70">📍 {event.address}</p>}
        </SportGradient>

        <div className="p-4 md:p-8 space-y-6">
          {event.description && (
            <div>
              <h2 className="mb-2 text-sm font-bold text-text">Description</h2>
              <p className="text-sm text-muted leading-relaxed">{event.description}</p>
            </div>
          )}

          <div className="flex gap-4">
            <div className="flex-1 rounded-xl border border-border bg-white p-4 text-center">
              <p className="font-mono text-2xl font-bold text-text">{event.filledAthlete || 0}<span className="text-muted text-sm">/{event.slotsAthlete}</span></p>
              <p className="text-xs text-muted">Participants</p>
            </div>
            <div className="flex-1 rounded-xl border border-border bg-white p-4 text-center">
              <p className="font-mono text-2xl font-bold text-text">{event.filledCoach || 0}<span className="text-muted text-sm">/{event.slotsCoach}</span></p>
              <p className="text-xs text-muted">Coachs</p>
            </div>
            <div className="flex-1 rounded-xl border border-border bg-white p-4 text-center">
              <p className="font-mono text-2xl font-bold text-brand-500">{event.price > 0 ? `${event.price}€` : 'Gratuit'}</p>
              <p className="text-xs text-muted">Prix</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Badge variant={event.type === 'platform' ? 'info' : 'pro'}>{event.type === 'platform' ? 'Officiel' : 'Partenaire'}</Badge>
            <Badge variant="sport">{event.level || 'Tous niveaux'}</Badge>
            {event.userStatus && <Badge variant="success">{event.userStatus}</Badge>}
          </div>
        </div>

        <div className="fixed bottom-16 left-0 right-0 p-4 md:bottom-0 md:left-60">
          <Button variant="primary" size="lg" className="w-full" onClick={async () => {
            await fetch(`/api/events/${id}/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: 'athlete' }),
            });
            window.location.reload();
          }}>
            {event.userStatus ? 'Déjà inscrit ✓' : "S'inscrire"}
          </Button>
        </div>
      </div>
    </>
  );
}

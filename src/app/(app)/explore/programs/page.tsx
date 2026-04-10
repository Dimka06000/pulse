'use client';

import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/pulse/app-header';
import { EmptyState } from '@/components/pulse/empty-state';
import { Badge } from '@/components/pulse/badge';
import { useAuthStore } from '@/stores/auth';
import { SPORT_EMOJIS, SPORT_LABELS } from '@/lib/sports';
import type { Sport } from '@/lib/sports';
import Link from 'next/link';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Program {
  id: string;
  title: string;
  description: string;
  sport: string;
  level: string;
  duration_weeks: number;
  price: number;
  is_published: boolean;
  coach_profiles: { display_name: string; avatar_url: string | null } | null;
}

const LEVEL_LABELS: Record<string, string> = {
  all: 'Tous niveaux',
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

export default function ExploreProgramsPage() {
  const { userId } = useAuthStore();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [pushingGarmin, setPushingGarmin] = useState<string | null>(null);
  const [garminConnected, setGarminConnected] = useState(false);

  // Check if Garmin is connected
  useEffect(() => {
    fetch('/api/connectors')
      .then(r => r.ok ? r.json() : { connections: [] })
      .then(d => {
        const conns = d.connections || [];
        setGarminConnected(conns.some((c: any) => c.provider === 'garmin' && c.is_active));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/programs?published=true')
      .then(r => r.ok ? r.json() : [])
      .then(data => setPrograms(Array.isArray(data) ? data : []))
      .catch(() => [])
      .finally(() => setLoading(false));
  }, []);

  const handleEnroll = async (programId: string) => {
    if (!userId) return;
    setEnrolling(programId);
    try {
      const res = await fetch(`/api/programs/${programId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok || res.status === 409) {
        setEnrolled(prev => new Set(prev).add(programId));
      }
    } catch { /* ignore */ }
    setEnrolling(null);
  };

  return (
    <>
      <AppHeader title="Programmes" />
      <div className="p-4 md:p-8 pb-24 max-w-3xl mx-auto">
        <h1 className="hidden md:block text-2xl font-extrabold text-text mb-6">Programmes d'entraînement</h1>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        ) : programs.length === 0 ? (
          <EmptyState
            icon="📝"
            title="Aucun programme disponible"
            description="Les coachs publient des programmes d'entraînement structurés ici."
            actionLabel="Explorer les coachs"
            onAction={() => { window.location.href = '/explore'; }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {programs.map(prog => {
              const isEnrolled = enrolled.has(prog.id);
              const sportEmoji = SPORT_EMOJIS[prog.sport as Sport] || '⚡';
              const sportLabel = SPORT_LABELS[prog.sport as Sport] || prog.sport;

              return (
                <div key={prog.id} className="rounded-2xl border border-border bg-white p-5 flex flex-col">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{sportEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-text truncate">{prog.title}</h3>
                      {prog.coach_profiles && (
                        <p className="text-xs text-muted">par {prog.coach_profiles.display_name || 'Coach'}</p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {prog.description && (
                    <p className="text-xs text-muted mb-3 line-clamp-2">{prog.description}</p>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <Badge variant="sport">{sportLabel}</Badge>
                    <Badge variant="info">{LEVEL_LABELS[prog.level] || prog.level}</Badge>
                    <Badge variant="success">{prog.duration_weeks} sem.</Badge>
                    {prog.price > 0 && <Badge variant="warning">{prog.price} €</Badge>}
                    {prog.price === 0 && <Badge variant="success">Gratuit</Badge>}
                  </div>

                  {/* CTA */}
                  <div className="mt-auto space-y-2">
                    {isEnrolled ? (
                      <>
                        <div className="rounded-xl bg-green-50 py-2.5 text-center text-sm font-semibold text-green-700">
                          ✓ Inscrit
                        </div>
                        {garminConnected && (
                          <button
                            onClick={async () => {
                              setPushingGarmin(prog.id);
                              try {
                                const res = await fetch(`/api/programs/${prog.id}/push-garmin`, { method: 'POST' });
                                const data = await res.json();
                                if (res.ok) {
                                  alert(`${data.pushed} séances envoyées sur votre Garmin !`);
                                } else {
                                  alert(data.error || 'Erreur');
                                }
                              } catch { /* ignore */ }
                              setPushingGarmin(null);
                            }}
                            disabled={pushingGarmin === prog.id}
                            className="w-full rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                          >
                            {pushingGarmin === prog.id ? 'Envoi...' : '⌚ Envoyer sur ma Garmin'}
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => handleEnroll(prog.id)}
                        disabled={enrolling === prog.id}
                        className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                      >
                        {enrolling === prog.id ? 'Inscription...' : prog.price > 0 ? `S'inscrire — ${prog.price} €` : "S'inscrire gratuitement"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

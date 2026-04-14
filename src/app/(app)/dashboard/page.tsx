'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/pulse/app-header';
import { StreakBadge } from '@/components/pulse/streak-badge';
import { CreateSessionModal } from '@/components/pulse/create-session-modal';
import { WorkoutSuggestionCard } from '@/components/pulse/workout-suggestion';
import { ReadinessScore } from '@/components/pulse/body-viz/ReadinessScore';
import { useBodyState } from '@/components/pulse/body-viz/use-body-state';
import { useAuthStore } from '@/stores/auth';
import { SPORT_EMOJIS } from '@/lib/sports';
import type { Sport } from '@/lib/sports';
import Link from 'next/link';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Onboarding checklist ──────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  href?: string;
}

function OnboardingChecklist({ items, onDismiss }: { items: ChecklistItem[]; onDismiss: () => void }) {
  const doneCount = items.filter(i => i.done).length;
  const progress = Math.round((doneCount / items.length) * 100);

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-text">Pour bien demarrer</h3>
        <button onClick={onDismiss} className="text-xs text-muted hover:text-text transition">
          Masquer
        </button>
      </div>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted">{doneCount}/{items.length} termine</p>
          <p className="text-xs font-semibold text-brand-500">{progress}%</p>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <Link
            key={item.id}
            href={item.href || '#'}
            className={`flex items-center gap-3 rounded-xl p-3 transition ${
              item.done ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] ${
              item.done ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300'
            }`}>
              {item.done && '✓'}
            </span>
            <span className={`text-sm font-medium ${item.done ? 'text-green-700 line-through' : 'text-text'}`}>
              {item.label}
            </span>
            {!item.done && <span className="ml-auto text-muted text-xs">→</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Motivational tagline based on readiness ───────────────────────────────────

function getMotivationalLine(readiness: number | null): string {
  if (readiness === null) return 'Pret pour une nouvelle journee ?';
  if (readiness >= 80) return 'Vous etes en pleine forme — allez-y a fond !';
  if (readiness >= 60) return 'Bonne forme — une seance moderee sera parfaite.';
  if (readiness >= 40) return 'Recuperation conseilee — privilegiez le leger.';
  return 'Votre corps a besoin de repos aujourd\'hui.';
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showChecklist, setShowChecklist] = useState(true);
  const { bodyState: dashBodyState } = useBodyState();

  // Onboarding redirect for brand-new users
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('pulse_onboarded')) return;
    if (userId) {
      fetch('/api/profile').then(r => r.ok ? r.json() : null).then(data => {
        if (data && !data.first_name) {
          router.push('/onboarding');
        } else {
          localStorage.setItem('pulse_onboarded', 'true');
        }
      }).catch(() => { localStorage.setItem('pulse_onboarded', 'true'); });
    }
  }, [router, userId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShowChecklist(!localStorage.getItem('pulse_checklist_dismissed'));
    }
  }, []);

  const fetchData = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      fetch('/api/dashboard/stats').then(r => r.ok ? r.json() : null),
      fetch('/api/streaks').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/solo-sessions?upcoming=true').then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([s, st, solo]) => {
        setStats(s);
        setStreak(st);
        setUpcomingSessions(Array.isArray(solo) ? solo : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <AppHeader title="Tableau de bord" />
        <div className="p-4 md:p-8 space-y-5 max-w-2xl mx-auto">
          <div className="h-16 w-64 animate-pulse rounded-2xl bg-gray-100" />
          <div className="flex gap-3 overflow-hidden">
            {[1,2,3,4].map(i => <div key={i} className="h-24 w-32 shrink-0 animate-pulse rounded-2xl bg-gray-100" />)}
          </div>
          {[1,2,3].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      </>
    );
  }

  // ── Data normalization ──────────────────────────────────────────────────────

  const s = stats || {
    firstName: null,
    sessionsThisWeek: 0,
    sessionsThisMonth: 0,
    totalTimeMinutes: 0,
    activeGoals: 0,
    nextSession: null,
    recentActivity: [],
    stravaConnected: false,
  };

  const st = streak || { current_streak: 0, longest_streak: 0, total_activities: 0 };
  const hours = Math.floor(s.totalTimeMinutes / 60);
  const mins = s.totalTimeMinutes % 60;
  const readiness = dashBodyState?.readinessScore ?? null;

  // Current date French
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  // Recent activity merged
  const soloRecent = upcomingSessions
    .filter((ss: any) => {
      const d = new Date(ss.scheduled_at);
      return d < new Date();
    })
    .map((ss: any) => ({
      title: ss.title || 'Seance solo',
      sport: ss.sport,
      emoji: SPORT_EMOJIS[ss.sport as Sport] || '⚡',
      duration: ss.duration_minutes,
      date: new Date(ss.scheduled_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      source: 'solo',
    }));

  const recentActivity = [...(s.recentActivity || []), ...soloRecent].slice(0, 4);

  // Upcoming sessions (future)
  const futureSessionsList = upcomingSessions
    .filter((ss: any) => new Date(ss.scheduled_at) >= new Date())
    .slice(0, 4)
    .map((ss: any) => ({
      title: ss.title || 'Seance solo',
      sport: ss.sport,
      emoji: SPORT_EMOJIS[ss.sport as Sport] || '⚡',
      duration: ss.duration_minutes,
      date: new Date(ss.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
      source: 'solo',
    }));

  // Next session from API or solo
  const nextSession = s.nextSession;

  // Onboarding checklist
  const checklistItems: ChecklistItem[] = [
    { id: 'strava', label: 'Connecter Strava', done: !!s.stravaConnected, href: '/profile/connections' },
    { id: 'goal', label: 'Definir un objectif', done: s.activeGoals > 0, href: '/goals' },
    { id: 'session', label: 'Planifier une seance', done: s.sessionsThisMonth > 0 || upcomingSessions.length > 0 },
    { id: 'journal', label: 'Remplir le journal', done: false, href: '/journal' },
  ];
  const allChecklistDone = checklistItems.every(i => i.done);

  const handleDismissChecklist = () => {
    setShowChecklist(false);
    localStorage.setItem('pulse_checklist_dismissed', 'true');
  };

  // Sport color for accent (default to brand)
  const accentColor = '#6366f1'; // brand indigo

  return (
    <>
      <AppHeader title="Tableau de bord" />

      <div className="p-4 md:p-8 space-y-5 max-w-2xl mx-auto pb-24">

        {/* ── GREETING SECTION ── */}
        <div className="pt-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">
                Bonjour{s.firstName ? `, ${s.firstName}` : ''} 👋
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">{todayCapitalized}</p>
              <p className="text-sm text-gray-500 mt-1">{getMotivationalLine(readiness)}</p>
            </div>
            {(st.current_streak > 0 || st.longest_streak > 0) && (
              <StreakBadge current={st.current_streak} longest={st.longest_streak} />
            )}
          </div>
        </div>

        {/* ── STATS ROW — horizontal scroll on mobile ── */}
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
          {/* Seances ce mois */}
          <div className="shrink-0 snap-start w-32 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] text-gray-400 font-medium leading-tight">Seances ce mois</p>
            <p className="font-mono text-3xl font-extrabold text-gray-900 mt-1">{s.sessionsThisMonth}</p>
          </div>

          {/* Heures */}
          <div className="shrink-0 snap-start w-32 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] text-gray-400 font-medium leading-tight">Heures d'entrainement</p>
            <p className="font-mono text-3xl font-extrabold text-gray-900 mt-1">
              {hours}<span className="text-base font-semibold text-gray-400">h{mins > 0 ? mins : ''}</span>
            </p>
          </div>

          {/* Objectifs */}
          <div className="shrink-0 snap-start w-32 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] text-gray-400 font-medium leading-tight">Objectifs actifs</p>
            <p className="font-mono text-3xl font-extrabold text-gray-900 mt-1">{s.activeGoals}</p>
          </div>

          {/* Readiness — only if body state available */}
          {dashBodyState && (
            <div
              className="shrink-0 snap-start w-36 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push('/progress#body')}
            >
              <p className="text-[11px] text-gray-400 font-medium leading-tight">Readiness</p>
              <div className="flex items-end gap-1 mt-1">
                <p
                  className="font-mono text-3xl font-extrabold"
                  style={{
                    color: dashBodyState.readinessScore >= 70 ? '#22c55e'
                      : dashBodyState.readinessScore >= 40 ? '#f59e0b'
                      : '#ef4444'
                  }}
                >
                  {dashBodyState.readinessScore}
                </p>
                <p className="text-sm text-gray-400 mb-1">/100</p>
              </div>
            </div>
          )}

          {/* Streak */}
          <div className="shrink-0 snap-start w-32 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] text-gray-400 font-medium leading-tight">Streak actuel</p>
            <p className="font-mono text-3xl font-extrabold text-gray-900 mt-1">
              {st.current_streak}<span className="text-base font-semibold text-gray-400">j</span>
            </p>
          </div>
        </div>

        {/* ── ENTRAINEMENT DU JOUR ── */}
        {(nextSession || s.todayWorkout) ? (
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            {/* sport accent bar */}
            <div className="h-1 w-full" style={{ background: accentColor }} />
            <div className="p-5">
              <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Entrainement du jour</p>
              <h2 className="text-lg font-bold text-gray-900 mt-1">
                {s.todayWorkout?.title || nextSession?.title}
              </h2>
              <div className="flex items-center gap-3 mt-2">
                {nextSession?.sport && !s.todayWorkout && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    {SPORT_EMOJIS[nextSession.sport as Sport] || '⚡'} {nextSession.sport}
                  </span>
                )}
                {s.todayWorkout && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    🏋️ {s.todayWorkout.exerciseCount} exercices
                  </span>
                )}
                {nextSession?.duration && !s.todayWorkout && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    ⏱ {nextSession.duration} min
                  </span>
                )}
                {nextSession?.coachName && !s.todayWorkout && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    👤 {nextSession.coachName}
                  </span>
                )}
              </div>
              <div className="mt-4">
                {s.todayWorkout?.hasExercises ? (
                  <Link
                    href={`/workout/${s.todayWorkout.id}`}
                    className="inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ background: accentColor }}
                  >
                    Commencer
                  </Link>
                ) : (
                  <button
                    className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ background: accentColor }}
                    onClick={() => setShowModal(true)}
                  >
                    {s.todayWorkout ? 'Planifier' : 'Commencer'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-center">
            <p className="text-2xl mb-2">😴</p>
            <p className="text-sm font-semibold text-gray-700">Jour de repos</p>
            <p className="text-xs text-gray-400 mt-0.5 mb-4">Aucune seance prevue aujourd'hui</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              + Planifier une seance
            </button>
          </div>
        )}

        {/* ── PROCHAINES SEANCES ── */}
        {futureSessionsList.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">Prochaines seances</h2>
              <Link href="/planning" className="text-xs text-indigo-500 font-medium hover:underline">
                Voir tout →
              </Link>
            </div>
            <div className="space-y-2">
              {futureSessionsList.map((session: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm overflow-hidden relative"
                >
                  {/* left sport accent */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: accentColor }} />
                  <span className="text-xl ml-1">{session.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{session.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{session.date} · {session.duration} min</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">Solo</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ACCES RAPIDE ── */}
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-3">Acces rapide</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xl">🏋️</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Nouvelle seance</p>
                <p className="text-xs text-gray-400">Seance solo</p>
              </div>
            </button>

            <Link
              href="/explore"
              className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">🔍</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Trouver un coach</p>
                <p className="text-xs text-gray-400">Explorer</p>
              </div>
            </Link>

            <Link
              href="/explore/programs"
              className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl">📋</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Programmes</p>
                <p className="text-xs text-gray-400">Plans d'entrainement</p>
              </div>
            </Link>

            <Link
              href={dashBodyState ? '/progress#body' : '/goals'}
              className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xl">
                {dashBodyState ? '🫀' : '🎯'}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{dashBodyState ? 'Mon corps' : 'Mes objectifs'}</p>
                <p className="text-xs text-gray-400">{dashBodyState ? 'Etat & recuperation' : 'Suivi progression'}</p>
              </div>
            </Link>
          </div>
        </div>

        {/* ── ACTIVITE RECENTE ── */}
        {recentActivity.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-3">Activite recente</h2>
            <div className="space-y-2">
              {recentActivity.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3.5">
                  <span className="text-xl opacity-70">{a.emoji || '🏃'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 truncate">{a.title}</p>
                    <p className="text-xs text-gray-400">{a.date} · {a.duration} min</p>
                  </div>
                  {a.source === 'solo' && (
                    <span className="rounded-full bg-white border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-400">Solo</span>
                  )}
                  {a.source === 'synced' && (
                    <span className="rounded-full bg-white border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-400">Sync</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── INSIGHT DU JOUR ── */}
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-3">Suggestion du jour</h2>
          <WorkoutSuggestionCard compact />
        </div>

        {/* ── READINESS CARD (full) — only if no inline stats ── */}
        {dashBodyState && !nextSession && (
          <ReadinessScore
            bodyState={dashBodyState}
            compact
            onClick={() => router.push('/progress#body')}
          />
        )}

        {/* ── ONBOARDING CHECKLIST ── */}
        {showChecklist && !allChecklistDone && (
          <OnboardingChecklist items={checklistItems} onDismiss={handleDismissChecklist} />
        )}

      </div>

      <CreateSessionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={fetchData}
      />
    </>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/pulse/app-header';
import { StatCard } from '@/components/pulse/stat-card';
import { Button } from '@/components/pulse/button';
import { ActivityRings } from '@/components/pulse/activity-rings';
import { StreakBadge } from '@/components/pulse/streak-badge';
import { CreateSessionModal } from '@/components/pulse/create-session-modal';
import { useAuthStore } from '@/stores/auth';
import { SPORT_EMOJIS } from '@/lib/sports';
import type { Sport } from '@/lib/sports';
import Link from 'next/link';
import { WorkoutSuggestionCard } from '@/components/pulse/workout-suggestion';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Onboarding checklist items
interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  href?: string;
  action?: () => void;
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

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted">{doneCount}/{items.length} termine</p>
          <p className="text-xs font-semibold text-brand-500">{progress}%</p>
        </div>
        <div className="h-2 rounded-full bg-surface overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-500 transition-all duration-500"
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
              item.done ? 'bg-green-50' : 'bg-surface hover:bg-surface/80'
            }`}
          >
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
              item.done
                ? 'border-green-500 bg-green-500 text-white'
                : 'border-gray-300'
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

export default function DashboardPage() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [soloSessions, setSoloSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showChecklist, setShowChecklist] = useState(true);

  // Redirect to onboarding only for brand new users (no data + no flag)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('pulse_onboarded')) return;
    // Check if user has any data before redirecting
    if (userId) {
      fetch('/api/dashboard/stats').then(r => r.json()).then(data => {
        if (data?.sessionsThisMonth === 0 && !data?.nextSession) {
          router.push('/onboarding');
        } else {
          localStorage.setItem('pulse_onboarded', 'true');
        }
      }).catch(() => {
        // If API fails, don't redirect — just skip onboarding
        localStorage.setItem('pulse_onboarded', 'true');
      });
    }
  }, [router, userId]);

  // Check if user dismissed the checklist
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
        setSoloSessions(Array.isArray(solo) ? solo.slice(0, 3) : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <>
        <AppHeader greeting="Bonjour 👋" title="Votre semaine" />
        <div className="p-4 md:p-8 space-y-4">
          {/* Skeleton: greeting */}
          <div className="h-8 w-48 animate-pulse rounded-2xl bg-surface" />
          {/* Skeleton: KPI cards */}
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface" />)}
          </div>
          {/* Skeleton: content blocks */}
          {[1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface" />)}
        </div>
      </>
    );
  }

  const s = stats || { firstName: null, sessionsThisWeek: 0, sessionsThisMonth: 0, totalTimeMinutes: 0, activeGoals: 0, nextSession: null, recentActivity: [], stravaConnected: false };
  const hours = Math.floor(s.totalTimeMinutes / 60);
  const mins = s.totalTimeMinutes % 60;
  const st = streak || { current_streak: 0, longest_streak: 0, total_activities: 0 };

  // Greeting with first name
  const greeting = s.firstName ? `Bonjour ${s.firstName} 👋` : 'Bonjour 👋';

  // Merge solo sessions into recent activity
  const soloRecent = soloSessions.map((ss: any) => ({
    title: ss.title || 'Seance solo',
    sport: ss.sport,
    emoji: SPORT_EMOJIS[ss.sport as Sport] || '⚡',
    duration: ss.duration_minutes,
    date: new Date(ss.scheduled_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    source: 'solo',
  }));
  const allRecent = [...(s.recentActivity || []), ...soloRecent].slice(0, 5);

  // Activity rings data (weekly approximation)
  const weekSessions = Math.min(s.sessionsThisMonth, 7);
  const weekMinutes = Math.min(s.totalTimeMinutes, 420);

  // Onboarding checklist items
  const checklistItems: ChecklistItem[] = [
    { id: 'strava', label: 'Connecter Strava', done: !!s.stravaConnected, href: '/profile/connections' },
    { id: 'goal', label: 'Definir un objectif', done: s.activeGoals > 0, href: '/goals' },
    { id: 'session', label: 'Planifier une seance', done: s.sessionsThisMonth > 0 || soloSessions.length > 0 },
    { id: 'journal', label: 'Remplir le journal', done: false, href: '/journal' },
  ];

  const allChecklistDone = checklistItems.every(i => i.done);

  const handleDismissChecklist = () => {
    setShowChecklist(false);
    localStorage.setItem('pulse_checklist_dismissed', 'true');
  };

  // Format next session date for KPI card
  const nextRdvLabel = s.nextSession
    ? new Date(s.nextSession.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) || s.nextSession.date
    : '—';

  // Current goal label
  const goalLabel = s.activeGoals > 0 ? `${s.activeGoals} en cours` : '—';

  return (
    <>
      <AppHeader greeting={greeting} title="Votre semaine" />
      <div className="p-4 md:p-8 space-y-6">
        {/* Desktop title + streak */}
        <div className="hidden md:flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-text">{greeting}</h1>
          <StreakBadge current={st.current_streak} longest={st.longest_streak} />
        </div>

        {/* Mobile greeting (visible) + streak */}
        <div className="flex md:hidden items-center justify-between">
          <h2 className="text-lg font-bold text-text">{greeting}</h2>
          <StreakBadge current={st.current_streak} longest={st.longest_streak} />
        </div>

        {/* 4 KPI cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <p className="text-xs text-muted">Seances cette semaine</p>
            <p className="font-mono text-2xl font-extrabold text-text">{s.sessionsThisWeek}</p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <p className="text-xs text-muted">Streak actuel</p>
            <p className="font-mono text-2xl font-extrabold text-text">
              {st.current_streak} <span className="text-sm font-normal text-muted">jours</span>
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <p className="text-xs text-muted">Prochain RDV</p>
            <p className="text-sm font-bold text-text mt-1">{nextRdvLabel}</p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <p className="text-xs text-muted">Objectif en cours</p>
            <p className="text-sm font-bold text-text mt-1">{goalLabel}</p>
          </div>
        </div>

        {/* Onboarding checklist (new users) */}
        {showChecklist && !allChecklistDone && (
          <OnboardingChecklist items={checklistItems} onDismiss={handleDismissChecklist} />
        )}

        {/* Next session */}
        {s.nextSession ? (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-500/15" />
            <p className="text-[11px] uppercase tracking-widest opacity-50">Prochaine seance</p>
            <p className="mt-1 text-lg font-bold">{s.nextSession.title}</p>
            <p className="text-sm opacity-60">{s.nextSession.date} · {s.nextSession.coachName || 'Solo'}</p>
            <div className="mt-3 flex gap-2">
              {s.nextSession.sport && (
                <span className="rounded-md bg-white/10 px-2 py-1 text-xs">{s.nextSession.sport}</span>
              )}
              <span className="rounded-md bg-white/10 px-2 py-1 text-xs">⏱ {s.nextSession.duration} min</span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white text-center">
            <p className="text-sm opacity-60">Aucune seance prevue</p>
            <Button variant="primary" size="sm" className="mt-3" onClick={() => setShowModal(true)}>
              Planifier une seance
            </Button>
          </div>
        )}

        {/* Activity Rings + Stats */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ActivityRings
            move={weekMinutes}
            moveGoal={300}
            exercise={weekSessions}
            exerciseGoal={5}
            stand={st.total_activities}
            standGoal={Math.max(st.total_activities, 20)}
            size={140}
          />
          <div className="grid grid-cols-3 sm:grid-cols-1 gap-3 flex-1 w-full">
            <StatCard variant="gradient" label="Seances" value={s.sessionsThisMonth} />
            <StatCard variant="white" label="Temps total" value={`${hours}h${mins > 0 ? mins : ''}`} />
            <StatCard variant="ring" label="Objectifs" percent={s.activeGoals > 0 ? 65 : 0} subtitle={s.activeGoals > 0 ? `${s.activeGoals} en cours` : 'Aucun'} />
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="mb-3 text-sm font-bold text-text">Acces rapide</h2>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-500 p-4 text-white text-center"
            >
              <span className="text-2xl">🏋️</span>
              <span className="text-[11px] font-semibold">Nouvelle seance</span>
            </button>
            <Link href="/explore" className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-white p-4 text-center">
              <span className="text-2xl">🔍</span>
              <span className="text-[11px] font-semibold text-text">Trouver un coach</span>
            </Link>
            <Link href="/goals" className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-white p-4 text-center">
              <span className="text-2xl">🎯</span>
              <span className="text-[11px] font-semibold text-text">Mes objectifs</span>
            </Link>
          </div>
        </div>

        {/* Recent activity */}
        {allRecent.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-bold text-text">Activite recente</h2>
            <div className="space-y-2">
              {allRecent.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
                  <span className="text-xl">{a.emoji || '🏃'}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text">{a.title}</p>
                    <p className="text-xs text-muted">{a.date} · {a.duration} min</p>
                  </div>
                  {a.source === 'solo' && (
                    <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-500">Solo</span>
                  )}
                  {a.source === 'synced' && (
                    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500">Sync</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insight du jour */}
        <div>
          <h2 className="mb-3 text-sm font-bold text-text">Insight du jour</h2>
          <WorkoutSuggestionCard compact />
        </div>
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

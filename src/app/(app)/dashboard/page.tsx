'use client';

import { useState, useEffect, useCallback } from 'react';
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

export default function DashboardPage() {
  const { userId } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [soloSessions, setSoloSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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
          {[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface" />)}
        </div>
      </>
    );
  }

  const s = stats || { sessionsThisMonth: 0, totalTimeMinutes: 0, activeGoals: 0, nextSession: null, recentActivity: [] };
  const hours = Math.floor(s.totalTimeMinutes / 60);
  const mins = s.totalTimeMinutes % 60;
  const st = streak || { current_streak: 0, longest_streak: 0, total_activities: 0 };

  // Merge solo sessions into recent activity
  const soloRecent = soloSessions.map((ss: any) => ({
    title: ss.title || 'Séance solo',
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

  return (
    <>
      <AppHeader greeting="Bonjour 👋" title="Votre semaine" />
      <div className="p-4 md:p-8 space-y-6">
        {/* Desktop title + streak */}
        <div className="hidden md:flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-text">Votre semaine</h1>
          <StreakBadge current={st.current_streak} longest={st.longest_streak} />
        </div>

        {/* Mobile streak */}
        <div className="flex md:hidden justify-center">
          <StreakBadge current={st.current_streak} longest={st.longest_streak} />
        </div>

        {/* Next session */}
        {s.nextSession ? (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-500/15" />
            <p className="text-[11px] uppercase tracking-widest opacity-50">Prochaine séance</p>
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
            <p className="text-sm opacity-60">Aucune séance prévue</p>
            <Button variant="primary" size="sm" className="mt-3" onClick={() => setShowModal(true)}>
              Planifier une séance
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
            <StatCard variant="gradient" label="Séances" value={s.sessionsThisMonth} />
            <StatCard variant="white" label="Temps total" value={`${hours}h${mins > 0 ? mins : ''}`} />
            <StatCard variant="ring" label="Objectifs" percent={s.activeGoals > 0 ? 65 : 0} subtitle={s.activeGoals > 0 ? `${s.activeGoals} en cours` : 'Aucun'} />
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="mb-3 text-sm font-bold text-text">Accès rapide</h2>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-500 p-4 text-white text-center"
            >
              <span className="text-2xl">🏋️</span>
              <span className="text-[11px] font-semibold">Nouvelle séance</span>
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
            <h2 className="mb-3 text-sm font-bold text-text">Activité récente</h2>
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

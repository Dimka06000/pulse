'use client';

import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/pulse/app-header';
import { StatCard } from '@/components/pulse/stat-card';
import { EmptyState } from '@/components/pulse/empty-state';
import { ActivityRings } from '@/components/pulse/activity-rings';
import { StreakBadge } from '@/components/pulse/streak-badge';
import { useAuthStore } from '@/stores/auth';
import { SPORT_EMOJIS, SPORT_LABELS } from '@/lib/sports';
import type { Sport } from '@/lib/sports';
import { BodyVisualization } from '@/components/pulse/body-viz/BodyVisualization';
import { ReadinessScore } from '@/components/pulse/body-viz/ReadinessScore';
import { useBodyState } from '@/components/pulse/body-viz/use-body-state';

type SubTab = 'summary' | 'goals' | 'nutrition' | 'body';

interface PersonalRecord {
  id: string;
  sport: string;
  metric_key: string;
  metric_label: string;
  value: number;
  unit: string;
  achieved_at: string;
}

export default function ProgressPage() {
  const { userId } = useAuthStore();
  // Check URL hash for initial tab (e.g., /progress#body)
  const [subTab, setSubTab] = useState<SubTab>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#body') return 'body';
    return 'summary';
  });
  const { bodyState, loading: bodyLoading } = useBodyState();
  const [stats, setStats] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    Promise.all([
      fetch('/api/dashboard/stats').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/streaks').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/records').then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([s, st, recs]) => {
        setStats(s);
        setStreak(st);
        setRecords(Array.isArray(recs) ? recs : []);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const tabs: { key: SubTab; label: string }[] = [
    { key: 'summary', label: 'Résumé' },
    { key: 'body', label: 'Mon corps' },
    { key: 'goals', label: 'Objectifs' },
    { key: 'nutrition', label: 'Nutrition' },
  ];

  const s = stats || { sessionsThisMonth: 0, totalTimeMinutes: 0, activeGoals: 0 };
  const st = streak || { current_streak: 0, longest_streak: 0, total_activities: 0 };
  const weekSessions = Math.min(s.sessionsThisMonth, 7);
  const weekMinutes = Math.min(s.totalTimeMinutes, 420);

  return (
    <>
      <AppHeader title="Mes progrès" />
      <div className="p-4 md:p-8">
        <h1 className="hidden md:block text-2xl font-extrabold text-text mb-6">Mes progrès</h1>

        {/* Sub-tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                subTab === t.key ? 'bg-gradient-to-r from-brand-500 to-cyan-500 text-white' : 'bg-surface text-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface" />)}
          </div>
        ) : (
          <>
            {subTab === 'summary' && (
              <div className="space-y-6">
                {/* Activity Rings + Streak */}
                <div className="flex flex-col sm:flex-row items-center gap-6 rounded-2xl bg-gradient-to-br from-brand-500/5 to-cyan-500/5 border border-brand-100 p-6">
                  <ActivityRings
                    move={weekMinutes}
                    moveGoal={300}
                    exercise={weekSessions}
                    exerciseGoal={5}
                    stand={st.total_activities}
                    standGoal={Math.max(st.total_activities, 20)}
                    size={160}
                  />
                  <div className="flex flex-col items-center sm:items-start gap-3">
                    <StreakBadge current={st.current_streak} longest={st.longest_streak} />
                    <div className="text-center sm:text-left">
                      <p className="text-sm text-muted">Cette semaine</p>
                      <p className="text-base font-semibold text-text">
                        {weekSessions > 0
                          ? `${weekSessions} séance${weekSessions > 1 ? 's' : ''}, ${Math.round(weekMinutes / 60)}h d'entraînement`
                          : 'Aucune activité encore'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard variant="gradient" label="Séances ce mois" value={s.sessionsThisMonth} />
                  <StatCard
                    variant="white"
                    label="Temps total"
                    value={`${Math.floor(s.totalTimeMinutes / 60)}h${s.totalTimeMinutes % 60 > 0 ? s.totalTimeMinutes % 60 : ''}`}
                  />
                </div>

                {/* Personal Records */}
                <div>
                  <h3 className="text-sm font-bold text-text mb-3">Records personnels 🔥</h3>
                  {records.length > 0 ? (
                    <div className="space-y-2">
                      {records.map((rec) => (
                        <div key={rec.id} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
                          <span className="text-xl">{SPORT_EMOJIS[rec.sport as Sport] || '🏆'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text">{rec.metric_label}</p>
                            <p className="text-xs text-muted">
                              {SPORT_LABELS[rec.sport as Sport] || rec.sport}
                              {' · '}
                              {new Date(rec.achieved_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-brand-500">{rec.value} {rec.unit}</p>
                            <p className="text-[10px] text-muted">🔥 PR</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon="🏆" title="Pas encore de records" description="Complétez des séances pour débloquer vos records" />
                  )}
                </div>
              </div>
            )}

            {subTab === 'body' && (
              <div className="space-y-4">
                {bodyLoading ? (
                  <div className="space-y-4">
                    <div className="h-[400px] animate-pulse rounded-2xl bg-surface" />
                    <div className="h-32 animate-pulse rounded-2xl bg-surface" />
                  </div>
                ) : bodyState ? (
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <BodyVisualization bodyState={bodyState} />
                    </div>
                    <div className="md:w-72 shrink-0">
                      <ReadinessScore bodyState={bodyState} />
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon="🫀"
                    title="Pas encore de données"
                    description="Complétez des séances pour visualiser l'état de votre corps"
                  />
                )}
              </div>
            )}

            {subTab === 'goals' && (
              <EmptyState icon="🎯" title="Aucun objectif" description="Fixez-vous un objectif pour suivre votre progression" actionLabel="Créer un objectif" onAction={() => { window.location.href = '/goals'; }} />
            )}

            {subTab === 'nutrition' && (
              <EmptyState icon="🥗" title="Pas de plan nutrition" description="Votre coach peut vous assigner un plan, ou créez le vôtre" />
            )}
          </>
        )}
      </div>
    </>
  );
}

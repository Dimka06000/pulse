'use client';

import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/pulse/app-header';
import { EmptyState } from '@/components/pulse/empty-state';
import { Skeleton } from '@/components/pulse/skeleton';
import { SPORT_EMOJIS, SPORT_LABELS, SPORT_GRADIENTS, type Sport } from '@/lib/sports';
import Link from 'next/link';

interface Workout {
  id: string;
  week_number: number;
  day_number: number;
  title: string;
}

interface TrainingProgram {
  id: string;
  title: string;
  description: string;
  sport: string;
  level: string;
  duration_weeks: number;
  price: number;
  cover_image_url: string | null;
  coach_profiles: { display_name: string; avatar_url: string | null } | null;
  program_workouts: Workout[];
}

interface Enrollment {
  id: string;
  created_at: string;
  enrolled_at?: string;
  program_id: string;
  athlete_id: string;
  training_programs: TrainingProgram | null;
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function getCurrentWeek(enrolledAt: string, totalWeeks: number): number {
  const start = new Date(enrolledAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(diffWeeks, totalWeeks);
}

function getProgress(enrolledAt: string, totalWeeks: number): number {
  const week = getCurrentWeek(enrolledAt, totalWeeks);
  return Math.round((week / totalWeeks) * 100);
}

function getTodayWorkout(workouts: Workout[], enrolledAt: string): Workout | null {
  const start = new Date(enrolledAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const weekNum = Math.floor(diffDays / 7) + 1;
  const dayNum = (diffDays % 7) + 1;

  return workouts.find(w => w.week_number === weekNum && w.day_number === dayNum) || null;
}

function ProgramEnrollmentCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <Skeleton className="h-32 rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-9 w-full mt-2" />
      </div>
    </div>
  );
}

export default function MyProgramsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/enrollments')
      .then(r => r.ok ? r.json() : [])
      .then(data => setEnrollments(Array.isArray(data) ? data : []))
      .catch(() => [])
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AppHeader title="Mes programmes" />
      <div className="p-4 md:p-8 pb-24 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="hidden md:block text-2xl font-extrabold text-text">Mes programmes</h1>
          <Link
            href="/explore/programs"
            className="ml-auto rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-text transition hover:bg-surface"
          >
            + Découvrir des programmes
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProgramEnrollmentCardSkeleton key={i} />
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <EmptyState
            icon="📝"
            title="Aucun programme en cours"
            description="Inscris-toi à un programme d'entraînement pour commencer."
            actionLabel="Explorer les programmes"
            onAction={() => { window.location.href = '/explore/programs'; }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {enrollments.map(enrollment => {
              const prog = enrollment.training_programs;
              if (!prog) return null;

              const enrolledAt = enrollment.enrolled_at || enrollment.created_at;
              const sportEmoji = SPORT_EMOJIS[prog.sport as Sport] || '⚡';
              const sportLabel = SPORT_LABELS[prog.sport as Sport] || prog.sport;
              const gradient = SPORT_GRADIENTS[prog.sport as Sport] || SPORT_GRADIENTS['autre'];
              const currentWeek = getCurrentWeek(enrolledAt, prog.duration_weeks);
              const progress = getProgress(enrolledAt, prog.duration_weeks);
              const todayWorkout = getTodayWorkout(prog.program_workouts || [], enrolledAt);
              const coachName = prog.coach_profiles?.display_name || 'Coach';
              const coachAvatar = prog.coach_profiles?.avatar_url;

              const enrollDate = new Date(enrolledAt);

              return (
                <div key={enrollment.id} className="rounded-2xl border border-border bg-white overflow-hidden">
                  {/* Cover */}
                  <div
                    className="relative h-28 flex items-end"
                    style={{ background: prog.cover_image_url ? undefined : gradient }}
                  >
                    {prog.cover_image_url && (
                      <img
                        src={prog.cover_image_url}
                        alt={prog.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="relative z-10 px-4 pb-3 flex items-end gap-2 w-full">
                      <span className="text-xl drop-shadow">{sportEmoji}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white drop-shadow truncate">{prog.title}</h3>
                        <p className="text-[11px] text-white/80">{sportLabel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    {/* Coach */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-5 w-5 rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {coachAvatar ? (
                          <img src={coachAvatar} alt={coachName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[8px] font-bold text-white">{coachName[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <span className="text-xs text-muted">{coachName}</span>
                      <span className="ml-auto text-[10px] text-muted">
                        Commencé le {enrollDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-text">
                          Semaine {currentWeek} / {prog.duration_weeks}
                        </span>
                        <span className="text-xs text-muted">{progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Today's workout */}
                    {todayWorkout ? (
                      <div className="mb-3 rounded-xl bg-brand-50 border border-brand-100 p-3">
                        <p className="text-[10px] font-semibold text-brand-500 uppercase tracking-wide mb-0.5">
                          Aujourd&apos;hui — {DAY_LABELS[(todayWorkout.day_number - 1) % 7]}
                        </p>
                        <p className="text-sm font-semibold text-text truncate">{todayWorkout.title}</p>
                      </div>
                    ) : (
                      <div className="mb-3 rounded-xl bg-surface border border-border/50 p-3">
                        <p className="text-xs text-muted text-center">Repos aujourd&apos;hui</p>
                      </div>
                    )}

                    {/* CTA */}
                    <Link
                      href={`/explore/programs/${prog.id}`}
                      className="block w-full rounded-xl border border-border py-2 text-center text-sm font-semibold text-text transition hover:bg-surface"
                    >
                      Voir le programme
                    </Link>
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

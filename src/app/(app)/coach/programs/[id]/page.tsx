'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/pulse/app-header';
import { Button } from '@/components/pulse';
import { useToast } from '@/components/pulse/toast';
import { PushToDevice } from '@/components/pulse/push-to-device';
import { SPORT_LABELS, SPORT_EMOJIS, type Sport } from '@/lib/sports';
import { WorkoutEditorModal, type WorkoutData } from '@/components/coach/workout-editor-modal';

interface Workout {
  id: string;
  week_number: number;
  day_number: number;
  title: string;
  description: string;
  workout_data: { exercises: Array<Record<string, unknown>> };
  duration_minutes: number;
}

interface Program {
  id: string;
  title: string;
  description: string;
  sport: string;
  level: string;
  duration_weeks: number;
  is_published: boolean;
  price: number;
  program_workouts: Workout[];
}

interface Client {
  id: string;
  name: string;
  avatarUrl: string | null;
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWeek, setActiveWeek] = useState(1);

  // Workout editor modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDay, setEditorDay] = useState(1);
  const [editWorkout, setEditWorkout] = useState<WorkoutData | null>(null);

  // Assign athlete
  const [showAssign, setShowAssign] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [loadingClients, setLoadingClients] = useState(false);

  // Inline delete confirmation
  const [confirmDeleteProgram, setConfirmDeleteProgram] = useState(false);
  const [confirmDeleteWorkoutId, setConfirmDeleteWorkoutId] = useState<string | null>(null);

  // Duplicate week
  const [duplicating, setDuplicating] = useState(false);

  const fetchProgram = useCallback(async () => {
    try {
      const res = await fetch(`/api/programs/${id}`);
      if (res.ok) {
        setProgram(await res.json());
      } else {
        toast('error', 'Erreur', 'Programme introuvable');
        router.push('/coach/programs');
      }
    } catch {
      toast('error', 'Erreur', 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  }, [id, router, toast]);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  // Fetch clients when assign panel opens
  useEffect(() => {
    if (showAssign && clients.length === 0) {
      setLoadingClients(true);
      fetch('/api/clients')
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setClients(data))
        .catch(() => setClients([]))
        .finally(() => setLoadingClients(false));
    }
  }, [showAssign, clients.length]);

  const togglePublish = async () => {
    if (!program) return;
    const res = await fetch(`/api/programs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_published: !program.is_published }),
    });
    if (res.ok) {
      toast('success', program.is_published ? 'Dépublié' : 'Publié !', '');
      fetchProgram();
    }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/programs/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast('success', 'Supprimé', 'Programme supprimé');
      router.push('/coach/programs');
    }
    setConfirmDeleteProgram(false);
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    const res = await fetch(`/api/programs/${id}/workouts?workout_id=${workoutId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      toast('success', 'Supprimé', 'Séance supprimée');
      fetchProgram();
    } else {
      toast('error', 'Erreur', 'Impossible de supprimer la séance');
    }
    setConfirmDeleteWorkoutId(null);
  };

  const openEditorForDay = (day: number) => {
    setEditorDay(day);
    setEditWorkout(null);
    setEditorOpen(true);
  };

  const openEditorForWorkout = (workout: Workout) => {
    setEditorDay(workout.day_number);
    setEditWorkout({
      id: workout.id,
      title: workout.title,
      description: workout.description,
      workout_data: {
        exercises: (workout.workout_data?.exercises || []).map((ex) => ({
          name: String(ex.name || ''),
          sets: ex.sets !== undefined ? Number(ex.sets) : undefined,
          reps: ex.reps !== undefined ? Number(ex.reps) : undefined,
          rest_seconds: ex.rest_seconds !== undefined ? Number(ex.rest_seconds) : undefined,
          duration_minutes: ex.duration_minutes !== undefined ? Number(ex.duration_minutes) : undefined,
        })),
      },
      duration_minutes: workout.duration_minutes,
      week_number: workout.week_number,
      day_number: workout.day_number,
    });
    setEditorOpen(true);
  };

  const handleDuplicateWeek = async () => {
    if (!program) return;
    const weekWorkouts = (program.program_workouts || []).filter(
      (w) => w.week_number === activeWeek
    );
    if (weekWorkouts.length === 0) {
      toast('error', 'Erreur', 'Aucune séance à dupliquer dans cette semaine');
      return;
    }

    // Find the next empty week
    const existingWeeks = new Set(
      (program.program_workouts || []).map((w) => w.week_number)
    );
    let targetWeek = activeWeek + 1;
    while (targetWeek <= program.duration_weeks && existingWeeks.has(targetWeek)) {
      targetWeek++;
    }
    if (targetWeek > program.duration_weeks) {
      toast('error', 'Erreur', 'Toutes les semaines suivantes contiennent déjà des séances');
      return;
    }

    setDuplicating(true);
    try {
      await Promise.all(
        weekWorkouts.map((w) =>
          fetch(`/api/programs/${id}/workouts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              week_number: targetWeek,
              day_number: w.day_number,
              title: w.title,
              description: w.description,
              workout_data: w.workout_data,
              duration_minutes: w.duration_minutes,
            }),
          })
        )
      );
      toast('success', 'Dupliqué', `Semaine ${activeWeek} copiée vers S${targetWeek}`);
      setActiveWeek(targetWeek);
      fetchProgram();
    } catch {
      toast('error', 'Erreur', 'Erreur lors de la duplication');
    } finally {
      setDuplicating(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedClientId) {
      toast('error', 'Erreur', 'Sélectionnez un athlète');
      return;
    }
    const res = await fetch(`/api/programs/${id}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athlete_id: selectedClientId }),
    });
    if (res.ok) {
      toast('success', 'Assigné', "L'athlète a été inscrit au programme");
      setShowAssign(false);
      setSelectedClientId('');
    } else {
      const data = await res.json();
      toast('error', 'Erreur', data.error);
    }
  };

  if (loading) {
    return (
      <>
        <AppHeader title="Programme" />
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      </>
    );
  }

  if (!program) return null;

  const weeks = Array.from({ length: program.duration_weeks }, (_, i) => i + 1);
  const weekWorkouts = (program.program_workouts || []).filter((w) => w.week_number === activeWeek);

  return (
    <>
      <AppHeader title={program.title} />
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="text-2xl">{SPORT_EMOJIS[program.sport as Sport] || '⚡'}</span>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-text">{program.title}</h2>
            <p className="text-sm text-muted">
              {SPORT_LABELS[program.sport as Sport] || program.sport} · {program.duration_weeks} semaines · {program.level}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant={program.is_published ? 'secondary' : 'primary'} onClick={togglePublish}>
              {program.is_published ? 'Dépublier' : 'Publier'}
            </Button>
            <Button size="sm" variant="dark" onClick={() => setShowAssign(!showAssign)}>
              Assigner
            </Button>
            {!confirmDeleteProgram ? (
              <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={() => setConfirmDeleteProgram(true)}>
                Supprimer
              </Button>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5">
                <span className="text-xs font-medium text-red-700">Supprimer ce programme ?</span>
                <button
                  onClick={() => setConfirmDeleteProgram(false)}
                  className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 transition"
                >
                  Confirmer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Assign athlete panel */}
        {showAssign && (
          <div className="mb-6 rounded-2xl border border-border bg-white p-4">
            <h4 className="mb-2 font-semibold text-text">Assigner un athlète</h4>
            <div className="flex gap-2">
              {loadingClients ? (
                <p className="text-sm text-muted py-2">Chargement...</p>
              ) : clients.length === 0 ? (
                <p className="text-sm text-muted py-2">Aucun client trouvé. Les athlètes ayant réservé une séance apparaîtront ici.</p>
              ) : (
                <>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                  >
                    <option value="">Sélectionner un athlète...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <Button size="sm" onClick={handleAssign}>Assigner</Button>
                </>
              )}
            </div>
          </div>
        )}

        {program.description && (
          <p className="mb-6 text-sm text-muted">{program.description}</p>
        )}

        {/* Week tabs */}
        <div className="mb-4 flex gap-1 overflow-x-auto items-center">
          {weeks.map((w) => {
            const hasWorkouts = (program.program_workouts || []).some((wo) => wo.week_number === w);
            return (
              <button
                key={w}
                onClick={() => setActiveWeek(w)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  w === activeWeek
                    ? 'bg-gradient-to-r from-brand-500 to-cyan-500 text-white'
                    : 'bg-surface text-muted hover:text-text'
                }`}
              >
                S{w}
                {hasWorkouts && w !== activeWeek && (
                  <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-brand-400" />
                )}
              </button>
            );
          })}
          {/* Duplicate week button */}
          <button
            onClick={handleDuplicateWeek}
            disabled={duplicating || weekWorkouts.length === 0}
            className="shrink-0 ml-2 rounded-lg px-3 py-2 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
            title="Dupliquer cette semaine vers la prochaine semaine vide"
          >
            {duplicating ? '...' : '⧉ Dupliquer S' + activeWeek}
          </button>
        </div>

        {/* Day grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const dayWorkouts = weekWorkouts.filter((w) => w.day_number === day);
            return (
              <div key={day} className="rounded-xl border border-border bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-text">{DAY_LABELS[day - 1] || `J${day}`}</span>
                  <button
                    onClick={() => openEditorForDay(day)}
                    className="text-xs text-brand-500 hover:underline"
                  >
                    + Ajouter
                  </button>
                </div>
                {dayWorkouts.length === 0 ? (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted/60">Aucune séance</p>
                    <button
                      onClick={() => openEditorForDay(day)}
                      className="text-xs text-brand-500 hover:underline"
                    >
                      + Ajouter
                    </button>
                  </div>
                ) : (
                  dayWorkouts.map((w) => (
                    <div
                      key={w.id}
                      className="mb-2 rounded-lg bg-surface p-3 cursor-pointer hover:ring-1 hover:ring-brand-300 transition group/workout"
                      onClick={() => openEditorForWorkout(w)}
                    >
                      {confirmDeleteWorkoutId === w.id ? (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                          <span className="flex-1 text-xs font-medium text-red-700">Supprimer ?</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteWorkoutId(null); }}
                            className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteWorkout(w.id); }}
                            className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700 transition"
                          >
                            Confirmer
                          </button>
                        </div>
                      ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text">{w.title}</p>
                          <p className="text-xs text-muted">{w.duration_minutes} min</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteWorkoutId(w.id);
                          }}
                          className="shrink-0 ml-2 h-6 w-6 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 md:opacity-0 md:group-hover/workout:opacity-100 transition text-xs"
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </div>
                      )}
                      {w.description && <p className="mt-1 text-xs text-muted">{w.description}</p>}
                      {/* Exercise summary */}
                      {w.workout_data?.exercises && w.workout_data.exercises.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {w.workout_data.exercises.slice(0, 3).map((ex: Record<string, unknown>, i: number) => (
                            <span key={i} className="text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full">
                              {String(ex.name)}
                            </span>
                          ))}
                          {w.workout_data.exercises.length > 3 && (
                            <span className="text-[10px] text-gray-400">
                              +{w.workout_data.exercises.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="mt-2">
                        <PushToDevice
                          workoutData={w.workout_data}
                          title={w.title}
                          sport={program.sport}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Workout editor modal */}
      <WorkoutEditorModal
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditWorkout(null); }}
        onSaved={() => fetchProgram()}
        sport={program.sport}
        weekNumber={activeWeek}
        dayNumber={editorDay}
        programId={program.id}
        editWorkout={editWorkout}
      />
    </>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/pulse/app-header';
import { Button, Input, Textarea } from '@/components/pulse';
import { useToast } from '@/components/pulse/toast';
import { PushToDevice } from '@/components/pulse/push-to-device';
import { SPORT_LABELS, SPORT_EMOJIS, type Sport } from '@/lib/sports';

interface Workout {
  id: string;
  week_number: number;
  day_number: number;
  title: string;
  description: string;
  workout_data: Record<string, unknown>;
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

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWeek, setActiveWeek] = useState(1);

  // Add workout form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDay, setAddDay] = useState(1);
  const [addTitle, setAddTitle] = useState('');
  const [addDesc, setAddDesc] = useState('');
  const [addDuration, setAddDuration] = useState('60');
  const [addExercises, setAddExercises] = useState('');
  const [saving, setSaving] = useState(false);

  // Assign athlete
  const [showAssign, setShowAssign] = useState(false);
  const [athleteId, setAthleteId] = useState('');

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
    if (!confirm('Supprimer ce programme ? Cette action est irréversible.')) return;
    const res = await fetch(`/api/programs/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast('success', 'Supprimé', 'Programme supprimé');
      router.push('/coach/programs');
    }
  };

  const handleAddWorkout = async () => {
    if (!addTitle.trim()) {
      toast('error', 'Erreur', 'Titre requis');
      return;
    }
    setSaving(true);

    // Parse exercises from text (simple format: "Squat 4x10, Bench 3x8")
    const exercises = addExercises
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
      .map((e) => {
        const match = e.match(/^(.+?)\s+(\d+)x(\d+)$/);
        if (match) {
          return { name: match[1], sets: Number(match[2]), reps: Number(match[3]), rest_seconds: 90 };
        }
        const durMatch = e.match(/^(.+?)\s+(\d+)\s*min$/i);
        if (durMatch) {
          return { name: durMatch[1], duration_minutes: Number(durMatch[2]) };
        }
        return { name: e, sets: 3, reps: 10, rest_seconds: 60 };
      });

    try {
      const res = await fetch(`/api/programs/${id}/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_number: activeWeek,
          day_number: addDay,
          title: addTitle.trim(),
          description: addDesc,
          workout_data: { exercises },
          duration_minutes: Number(addDuration),
        }),
      });
      if (res.ok) {
        toast('success', 'Ajouté', 'Séance ajoutée');
        setShowAddForm(false);
        setAddTitle('');
        setAddDesc('');
        setAddExercises('');
        fetchProgram();
      } else {
        const data = await res.json();
        toast('error', 'Erreur', data.error);
      }
    } catch {
      toast('error', 'Erreur', 'Connexion impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!athleteId.trim()) {
      toast('error', 'Erreur', "ID de l'athlète requis");
      return;
    }
    const res = await fetch(`/api/programs/${id}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athlete_id: athleteId }),
    });
    if (res.ok) {
      toast('success', 'Assigné', "L'athlète a été inscrit au programme");
      setShowAssign(false);
      setAthleteId('');
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
          <div className="flex gap-2">
            <Button size="sm" variant={program.is_published ? 'secondary' : 'primary'} onClick={togglePublish}>
              {program.is_published ? 'Dépublier' : 'Publier'}
            </Button>
            <Button size="sm" variant="dark" onClick={() => setShowAssign(!showAssign)}>
              Assigner
            </Button>
            <Button size="sm" variant="danger" onClick={handleDelete}>
              Supprimer
            </Button>
          </div>
        </div>

        {/* Assign athlete modal */}
        {showAssign && (
          <div className="mb-6 rounded-2xl border border-border bg-white p-4">
            <h4 className="mb-2 font-semibold text-text">Assigner un athlète</h4>
            <div className="flex gap-2">
              <Input
                placeholder="ID de l'athlète"
                value={athleteId}
                onChange={(e) => setAthleteId(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" onClick={handleAssign}>Assigner</Button>
            </div>
          </div>
        )}

        {program.description && (
          <p className="mb-6 text-sm text-muted">{program.description}</p>
        )}

        {/* Week tabs */}
        <div className="mb-4 flex gap-1 overflow-x-auto">
          {weeks.map((w) => (
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
            </button>
          ))}
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
                    onClick={() => {
                      setAddDay(day);
                      setShowAddForm(true);
                    }}
                    className="text-xs text-brand-500 hover:underline"
                  >
                    + Ajouter
                  </button>
                </div>
                {dayWorkouts.length === 0 ? (
                  <p className="text-xs text-muted/60">Repos</p>
                ) : (
                  dayWorkouts.map((w) => (
                    <div key={w.id} className="mb-2 rounded-lg bg-surface p-3">
                      <p className="text-sm font-medium text-text">{w.title}</p>
                      <p className="text-xs text-muted">{w.duration_minutes} min</p>
                      {w.description && <p className="mt-1 text-xs text-muted">{w.description}</p>}
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

        {/* Add workout form */}
        {showAddForm && (
          <div className="mt-6 rounded-2xl border border-border bg-white p-6">
            <h3 className="mb-4 font-bold text-text">
              Ajouter une séance — Semaine {activeWeek}, {DAY_LABELS[addDay - 1] || `Jour ${addDay}`}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Titre"
                required
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder="Ex: Upper Body Strength"
              />
              <Input
                label="Durée (min)"
                type="number"
                value={addDuration}
                onChange={(e) => setAddDuration(e.target.value)}
              />
              <Textarea
                label="Description"
                className="sm:col-span-2"
                value={addDesc}
                onChange={(e) => setAddDesc(e.target.value)}
                rows={2}
              />
              <Textarea
                label="Exercices (format: Squat 4x10, Bench 3x8, Plank 2 min)"
                className="sm:col-span-2"
                value={addExercises}
                onChange={(e) => setAddExercises(e.target.value)}
                rows={3}
                placeholder="Squat 4x10, Bench Press 3x8, Plank 2 min"
              />
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>Annuler</Button>
              <Button loading={saving} onClick={handleAddWorkout}>Ajouter la séance</Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

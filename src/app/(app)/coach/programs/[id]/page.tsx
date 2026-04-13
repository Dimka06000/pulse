'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/pulse/app-header';
import { Button } from '@/components/pulse';
import { useToast } from '@/components/pulse/toast';
import { SPORT_LABELS, SPORT_EMOJIS, type Sport } from '@/lib/sports';
import { WorkoutEditorModal, type WorkoutData } from '@/components/coach/workout-editor-modal';
import { TimelineBar, type ProgramBlock } from '@/components/coach/program-builder/timeline-bar';
import { BlockEditorModal } from '@/components/coach/program-builder/block-editor-modal';
import { ProgramBuilder } from '@/components/coach/program-builder/program-builder';

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
  pro_mode?: boolean;
  athlete_id?: string;
  program_workouts: Workout[];
}

interface Client {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);

  // Periodization blocks
  const [blocks, setBlocks] = useState<ProgramBlock[]>([]);
  const [blockEditorOpen, setBlockEditorOpen] = useState(false);
  const [editBlock, setEditBlock] = useState<ProgramBlock | null>(null);

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

  // AI generate
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [generateLevel, setGenerateLevel] = useState<string>('intermediate');
  const [generating, setGenerating] = useState(false);

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
    fetch(`/api/programs/${id}/blocks`).then(r => r.ok ? r.json() : []).then(setBlocks);
  }, [fetchProgram, id]);

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

  async function handleAutoPeriodize() {
    if (!program) return;
    const today = new Date().toISOString().slice(0, 10);
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + program.duration_weeks * 7);

    const res = await fetch(`/api/programs/${id}/periodize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: today,
        eventDate: eventDate.toISOString().slice(0, 10),
        sport: program.sport,
        athleteLevel: 'intermediate',
      }),
    });
    if (res.ok) {
      const newBlocks = await res.json();
      setBlocks(newBlocks);
      toast('success', 'Périodisation générée', `${newBlocks.length} blocs créés`);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/programs/${id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteLevel: generateLevel }),
      });
      if (res.ok) {
        const data = await res.json();
        toast('success', 'Programme généré', `${data.count} séances créées`);
        setShowGenerateConfirm(false);
        fetchProgram();
      } else {
        const err = await res.json();
        toast('error', 'Erreur', err.error || 'Échec de la génération');
      }
    } catch {
      toast('error', 'Erreur', 'Connexion impossible');
    } finally {
      setGenerating(false);
    }
  }

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
            <button
              onClick={async () => {
                const res = await fetch(`/api/programs/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ pro_mode: !program.pro_mode }),
                });
                if (res.ok) fetchProgram();
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                program.pro_mode
                  ? 'bg-violet-500 text-white border-violet-500'
                  : 'bg-white text-gray-500 border-gray-300 hover:border-violet-400'
              }`}
            >
              {program.pro_mode ? '🔬 Mode Pro' : 'Mode Pro'}
            </button>
            <Button size="sm" variant="secondary" onClick={() => {
              window.open(`/api/programs/${id}/calendar`, '_blank');
            }}>
              📅 Exporter calendrier
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowGenerateConfirm(true)}>
              Générer avec l&apos;IA
            </Button>
            <Button size="sm" variant="secondary" onClick={handleAutoPeriodize}>
              Auto-périodiser
            </Button>
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

        {/* AI Generate confirmation panel */}
        {showGenerateConfirm && (
          <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <h4 className="mb-3 font-semibold text-text">Générer le programme avec l&apos;IA</h4>
            <p className="text-sm text-muted mb-3">
              L&apos;IA va créer des séances pour chaque semaine en fonction de la périodisation et du sport.
            </p>
            <div className="flex gap-2 mb-4">
              {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setGenerateLevel(level)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    generateLevel === level
                      ? 'bg-brand-500 text-white'
                      : 'bg-white text-gray-600 border'
                  }`}
                >
                  {level === 'beginner'
                    ? 'Débutant'
                    : level === 'intermediate'
                      ? 'Intermédiaire'
                      : 'Avancé'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowGenerateConfirm(false)}>
                Annuler
              </Button>
              <Button size="sm" disabled={generating} onClick={handleGenerate}>
                {generating ? 'Génération en cours...' : 'Générer'}
              </Button>
            </div>
          </div>
        )}

        {program.description && (
          <p className="mb-6 text-sm text-muted">{program.description}</p>
        )}

        {/* Periodization timeline */}
        {blocks.length > 0 && (
          <div className="mb-6">
            <TimelineBar
              blocks={blocks}
              totalWeeks={program.duration_weeks}
              activeWeek={1}
              onBlockClick={(block) => { setEditBlock(block); setBlockEditorOpen(true); }}
              onAddBlock={() => { setEditBlock(null); setBlockEditorOpen(true); }}
            />
          </div>
        )}

        {/* Program Builder with DnD */}
        <div className="rounded-2xl border border-border bg-white overflow-hidden" style={{ minHeight: '500px' }}>
          <ProgramBuilder
            programId={id}
            program={program}
            initialWorkouts={program.program_workouts || []}
            blocks={blocks}
            onWorkoutsChange={fetchProgram}
            onClickWorkout={(w) => { openEditorForWorkout(w as Workout); }}
            onDeleteWorkout={handleDeleteWorkout}
            proMode={program.pro_mode}
            athleteId={program.athlete_id}
          />
        </div>
      </div>

      {/* Workout editor modal */}
      <WorkoutEditorModal
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditWorkout(null); }}
        onSaved={() => fetchProgram()}
        sport={program.sport}
        weekNumber={editWorkout?.week_number || 1}
        dayNumber={editorDay}
        programId={program.id}
        editWorkout={editWorkout}
      />

      {/* Block editor modal */}
      <BlockEditorModal
        open={blockEditorOpen}
        onClose={() => { setBlockEditorOpen(false); setEditBlock(null); }}
        onSaved={(saved) => {
          if (editBlock) {
            setBlocks(prev => prev.map(b => b.id === saved.id ? saved : b));
          } else {
            setBlocks(prev => [...prev, saved]);
          }
          setBlockEditorOpen(false);
          setEditBlock(null);
        }}
        programId={id}
        editBlock={editBlock}
      />
    </>
  );
}

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

  // Share / Notify
  const [notifyCount, setNotifyCount] = useState<number | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [notified, setNotified] = useState(false);
  const [showNotifyConfirm, setShowNotifyConfirm] = useState(false);

  // Marketplace panel
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [priceInput, setPriceInput] = useState<string>('');
  const [savingPrice, setSavingPrice] = useState(false);

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
    // Validate at least 1 workout before publishing
    if (!program.is_published && (!program.program_workouts || program.program_workouts.length === 0)) {
      toast('error', 'Impossible de publier', 'Ajoutez au moins une séance avant de publier ce programme.');
      return;
    }
    const res = await fetch(`/api/programs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_published: !program.is_published }),
    });
    if (res.ok) {
      toast('success', program.is_published ? 'Dépublié' : 'Publié sur le marketplace !', '');
      fetchProgram();
    }
  };

  const savePrice = async () => {
    if (!program) return;
    const price = parseFloat(priceInput);
    if (isNaN(price) || price < 0) {
      toast('error', 'Prix invalide', 'Entrez un montant valide (0 pour gratuit)');
      return;
    }
    setSavingPrice(true);
    const res = await fetch(`/api/programs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price }),
    });
    if (res.ok) {
      toast('success', 'Prix mis à jour', price === 0 ? 'Programme gratuit' : `${price}€`);
      fetchProgram();
    }
    setSavingPrice(false);
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

  async function handleShare() {
    if (!program) return;
    const link = `https://pulse-eight-sigma.vercel.app/explore/programs/${id}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: program.title,
          text: `Découvre mon programme : ${program.title}`,
          url: link,
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      toast('success', 'Lien copié !', 'Partagez-le avec vos athlètes');
    } catch {
      toast('error', 'Erreur', 'Impossible de copier le lien');
    }
  }

  async function fetchNotifyCount() {
    const res = await fetch(`/api/programs/${id}/notify`);
    if (res.ok) {
      const data = await res.json();
      setNotifyCount(data.count ?? 0);
    }
  }

  async function handleNotify() {
    setNotifying(true);
    try {
      const res = await fetch(`/api/programs/${id}/notify`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        toast('success', `${data.notified} athlètes notifiés !`, 'La notification a été envoyée');
        setNotified(true);
      } else {
        const err = await res.json();
        toast('error', 'Erreur', err.error || 'Échec de l\'envoi');
      }
    } catch {
      toast('error', 'Erreur', 'Connexion impossible');
    } finally {
      setNotifying(false);
      setShowNotifyConfirm(false);
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

  const sportAccentColors: Record<string, string> = {
    running: '#3b82f6', trail: '#10b981', triathlon: '#0ea5e9', crossfit: '#ef4444',
    musculation: '#10b981', cyclisme: '#14b8a6', natation: '#0ea5e9', yoga: '#8b5cf6',
    boxe: '#f59e0b', fitness: '#f97316', pilates: '#a78bfa', meditation: '#6366f1',
    duathlon: '#22c55e', autre: '#64748b',
  };
  const accentColor = sportAccentColors[program.sport] || '#64748b';

  const levelLabel: Record<string, string> = {
    beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé',
  };

  const totalWorkouts = program.program_workouts?.length || 0;
  const totalDuration = program.program_workouts?.reduce((acc, w) => acc + (w.duration_minutes || 0), 0) || 0;

  return (
    <>
      <AppHeader title={program.title} />
      <div className="p-4 md:p-8 max-w-6xl mx-auto">

        {/* Header card */}
        <div
          className="mb-4 rounded-2xl border border-border bg-white overflow-hidden"
          style={{ borderTop: `3px solid ${accentColor}` }}
        >
          <div className="px-5 py-4">
            <div className="flex items-start gap-4">
              {/* Sport icon */}
              <div
                className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                {SPORT_EMOJIS[program.sport as Sport] || '⚡'}
              </div>

              {/* Title + badges */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-text leading-tight">{program.title}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {SPORT_LABELS[program.sport as Sport] || program.sport}
                  </span>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {program.duration_weeks} semaines
                  </span>
                  {program.level && (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {levelLabel[program.level] || program.level}
                    </span>
                  )}
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      program.is_published
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {program.is_published ? '✓ Publié' : 'Brouillon'}
                  </span>
                </div>
                {program.description && (
                  <p className="text-sm text-muted mt-2">{program.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="border-t border-border px-5 py-3 flex items-center gap-6">
            <div className="text-center">
              <p className="text-lg font-bold text-text">{totalWorkouts}</p>
              <p className="text-xs text-muted">séances</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-text">{program.duration_weeks}</p>
              <p className="text-xs text-muted">semaines</p>
            </div>
            {totalDuration > 0 && (
              <>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <p className="text-lg font-bold text-text">{Math.round(totalDuration / 60)}h</p>
                  <p className="text-xs text-muted">de contenu</p>
                </div>
              </>
            )}
            {program.price !== undefined && program.price !== null && (
              <>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <p className="text-lg font-bold" style={{ color: accentColor }}>
                    {program.price === 0 ? 'Gratuit' : `${program.price}€`}
                  </p>
                  <p className="text-xs text-muted">prix</p>
                </div>
              </>
            )}
          </div>

          {/* Quick actions bar */}
          <div className="border-t border-border px-5 py-3 flex flex-wrap items-center gap-2">
            {/* Pro mode toggle */}
            <button
              onClick={async () => {
                const res = await fetch(`/api/programs/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ pro_mode: !program.pro_mode }),
                });
                if (res.ok) fetchProgram();
              }}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                program.pro_mode
                  ? 'bg-violet-500 text-white border-violet-500'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-violet-400 hover:text-violet-600'
              }`}
            >
              🔬 Mode Pro
            </button>

            <button
              onClick={() => setShowGenerateConfirm(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
            >
              🤖 Générer IA
            </button>

            <button
              onClick={handleAutoPeriodize}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              📊 Auto-périodiser
            </button>

            <button
              onClick={() => window.open(`/api/programs/${id}/calendar`, '_blank')}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-teal-400 hover:text-teal-600 transition-colors"
            >
              📅 Exporter calendrier
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-sky-400 hover:text-sky-600 transition-colors"
            >
              🔗 Partager
            </button>

            {program.is_published && (
              <button
                onClick={() => {
                  if (!notified) {
                    fetchNotifyCount();
                    setShowNotifyConfirm(true);
                  }
                }}
                disabled={notified || notifying}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                  notified
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 cursor-default'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-violet-400 hover:text-violet-600'
                }`}
              >
                {notified ? '✓ Notification envoyée' : '🔔 Notifier mes athlètes'}
              </button>
            )}

            <button
              onClick={() => setShowAssign(!showAssign)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-400 transition-colors"
            >
              👤 Assigner athlète
            </button>

            <button
              onClick={() => setShowMarketplace(!showMarketplace)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                program.is_published
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-brand-500 text-white border-brand-500 hover:bg-brand-600'
              }`}
            >
              🏪 {program.is_published ? 'Marketplace ✓' : 'Publier'}
            </button>

            <div className="ml-auto">
              {!confirmDeleteProgram ? (
                <button
                  onClick={() => setConfirmDeleteProgram(true)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-400 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  🗑️ Supprimer
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5">
                  <span className="text-xs font-medium text-red-700">Supprimer ce programme ?</span>
                  <button
                    onClick={() => setConfirmDeleteProgram(false)}
                    className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition border border-gray-200"
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
        </div>

        {/* Assign athlete panel */}
        {showAssign && (
          <div className="mb-4 rounded-2xl border border-border bg-white p-4">
            <h4 className="mb-3 font-semibold text-text flex items-center gap-2">
              👤 Assigner un athlète
            </h4>
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

        {/* Notify confirm panel */}
        {showNotifyConfirm && (
          <div className="mb-4 rounded-2xl border border-border bg-white p-5">
            <h4 className="mb-2 font-semibold text-text">🔔 Notifier vos athlètes</h4>
            <p className="text-sm text-muted mb-4">
              {notifyCount === null
                ? 'Chargement...'
                : notifyCount === 0
                  ? 'Aucun athlète à notifier pour le moment.'
                  : `Envoyer une notification à ${notifyCount} athlète${notifyCount > 1 ? 's' : ''} ?`}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowNotifyConfirm(false)}>
                Annuler
              </Button>
              {notifyCount !== null && notifyCount > 0 && (
                <Button size="sm" disabled={notifying} onClick={handleNotify}>
                  {notifying ? 'Envoi...' : `Envoyer à ${notifyCount} athlète${notifyCount > 1 ? 's' : ''}`}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Marketplace panel */}
        {showMarketplace && (
          <div className="mb-4 rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-text">🏪 Publier sur le marketplace</h4>
              {program.is_published && (
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  ✓ En ligne
                </span>
              )}
            </div>

            {/* Price setting */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text mb-1.5">Prix</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={String(program.price ?? 0)}
                    value={priceInput}
                    onChange={e => setPriceInput(e.target.value)}
                    className="w-full rounded-xl border border-border px-3 py-2 pr-8 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">€</span>
                </div>
                <button
                  onClick={savePrice}
                  disabled={savingPrice || priceInput === ''}
                  className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                >
                  {savingPrice ? '...' : 'Enregistrer'}
                </button>
              </div>
              <p className="text-xs text-muted mt-1.5">
                Prix actuel : {program.price === 0 ? 'Gratuit' : `${program.price}€`} · Entrez 0 pour gratuit
              </p>
            </div>

            {/* Preview card */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Aperçu marketplace</p>
              <div className="rounded-xl border border-border overflow-hidden max-w-xs">
                <div
                  className="h-2"
                  style={{ backgroundColor: accentColor }}
                />
                <div className="p-3 bg-white">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{SPORT_EMOJIS[program.sport as Sport] || '⚡'}</span>
                    <p className="text-sm font-bold text-text">{program.title}</p>
                  </div>
                  <p className="text-xs text-muted">{program.duration_weeks} semaines</p>
                  {program.description && (
                    <p className="text-[11px] text-muted line-clamp-2 mt-1">{program.description}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold" style={{ color: accentColor }}>
                      {(program.price ?? 0) === 0 ? 'Gratuit' : `${program.price}€`}
                    </span>
                    <span className="text-xs text-brand-600 font-medium">
                      {(program.price ?? 0) === 0 ? "S'inscrire" : 'Acheter'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Publish toggle */}
            <div className="flex gap-2">
              <button
                onClick={togglePublish}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                  program.is_published
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-brand-500 text-white hover:bg-brand-600'
                }`}
              >
                {program.is_published ? 'Dépublier du marketplace' : 'Publier sur le marketplace'}
              </button>
              {program.is_published && (
                <a
                  href={`/explore/programs/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text transition hover:bg-surface"
                >
                  Voir
                </a>
              )}
            </div>
            {!program.is_published && (!program.program_workouts || program.program_workouts.length === 0) && (
              <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                ⚠️ Ajoutez au moins une séance avant de publier.
              </p>
            )}
          </div>
        )}

        {/* AI Generate confirmation panel */}
        {showGenerateConfirm && (
          <div className="mb-4 rounded-2xl border border-border bg-white p-5">
            <h4 className="mb-2 font-semibold text-text">🤖 Générer le programme avec l&apos;IA</h4>
            <p className="text-sm text-muted mb-4">
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
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-brand-300'
                  }`}
                >
                  {level === 'beginner' ? 'Débutant' : level === 'intermediate' ? 'Intermédiaire' : 'Avancé'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowGenerateConfirm(false)}>
                Annuler
              </Button>
              <Button size="sm" disabled={generating} onClick={handleGenerate}>
                {generating ? 'Génération...' : 'Générer les séances'}
              </Button>
            </div>
          </div>
        )}

        {/* Periodization timeline */}
        {blocks.length > 0 && (
          <div className="mb-4 rounded-2xl border border-border bg-white p-4">
            <h4 className="text-sm font-semibold text-text mb-3">📊 Périodisation</h4>
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

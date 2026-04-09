'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppHeader } from '@/components/pulse/app-header';
import { Button, EmptyState, Input, Select, Textarea, SportGradient } from '@/components/pulse';
import { useToast } from '@/components/pulse/toast';
import { SPORTS, SPORT_LABELS, SPORT_EMOJIS, type Sport } from '@/lib/sports';

interface Program {
  id: string;
  title: string;
  description: string;
  sport: string;
  level: string;
  duration_weeks: number;
  is_published: boolean;
  price: number;
  created_at: string;
}

const LEVEL_OPTIONS = [
  { value: 'all', label: 'Tous niveaux' },
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
];

export default function CoachProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sport, setSport] = useState('crossfit');
  const [level, setLevel] = useState('all');
  const [durationWeeks, setDurationWeeks] = useState('4');

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await fetch('/api/programs?coach_id=mine');
      // The API will return all if coach_id=mine doesn't match — use own endpoint
      const meRes = await fetch('/api/coaches/me');
      if (!meRes.ok) return;
      const coach = await meRes.json();

      const progsRes = await fetch(`/api/programs?coach_id=${coach.id}`);
      if (progsRes.ok) {
        setPrograms(await progsRes.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast('error', 'Erreur', 'Le titre est requis');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description,
          sport,
          level,
          duration_weeks: Number(durationWeeks),
        }),
      });
      if (res.ok) {
        toast('success', 'Créé', 'Programme créé avec succès');
        setShowForm(false);
        setTitle('');
        setDescription('');
        fetchPrograms();
      } else {
        const data = await res.json();
        toast('error', 'Erreur', data.error || 'Impossible de créer le programme');
      }
    } catch {
      toast('error', 'Erreur', 'Connexion impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AppHeader title="Programmes" />
      <div className="p-4 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted">{programs.length} programme{programs.length !== 1 ? 's' : ''}</p>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Annuler' : '+ Créer un programme'}
          </Button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="mb-8 rounded-2xl border border-border bg-white p-6">
            <h3 className="mb-4 text-lg font-bold text-text">Nouveau programme</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Titre"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Programme Force 8 semaines"
              />
              <Select
                label="Sport"
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                options={SPORTS.map((s) => ({ value: s, label: `${SPORT_EMOJIS[s]} ${SPORT_LABELS[s]}` }))}
              />
              <Select
                label="Niveau"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                options={LEVEL_OPTIONS}
              />
              <Input
                label="Durée (semaines)"
                type="number"
                min={1}
                max={52}
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(e.target.value)}
              />
              <Textarea
                label="Description"
                className="sm:col-span-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre programme..."
                rows={3}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button loading={saving} onClick={handleCreate}>
                Créer le programme
              </Button>
            </div>
          </div>
        )}

        {/* Programs list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : programs.length === 0 ? (
          <EmptyState
            icon="📝"
            title="Aucun programme"
            description="Créez votre premier programme d'entraînement pour vos athlètes."
            actionLabel="Créer un programme"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p) => (
              <a
                key={p.id}
                href={`/coach/programs/${p.id}`}
                className="group overflow-hidden rounded-2xl border border-border bg-white transition-shadow hover:shadow-lg"
              >
                <SportGradient sport={p.sport} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{SPORT_EMOJIS[p.sport as Sport] || '⚡'}</span>
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                      {p.duration_weeks} sem.
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold">{p.title}</h3>
                </SportGradient>
                <div className="px-5 py-3">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{SPORT_LABELS[p.sport as Sport] || p.sport}</span>
                    <span className={p.is_published ? 'text-brand-500 font-semibold' : 'text-amber-500'}>
                      {p.is_published ? 'Publié' : 'Brouillon'}
                    </span>
                  </div>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{p.description}</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

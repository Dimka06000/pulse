'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/pulse/app-header';
import { Button, EmptyState, SportGradient } from '@/components/pulse';
import { useToast } from '@/components/pulse/toast';
import { SPORT_LABELS, SPORT_EMOJIS, type Sport } from '@/lib/sports';
import { ProgramWizardModal, type ProgramData } from '@/components/coach/program-wizard-modal';

export default function CoachProgramsPage() {
  const [programs, setPrograms] = useState<ProgramData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editProgram, setEditProgram] = useState<ProgramData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPrograms = useCallback(async () => {
    try {
      setError(null);
      const meRes = await fetch('/api/coaches/me');
      if (meRes.status === 401) { setError('auth'); return; }
      if (meRes.status === 403) { setError('not-coach'); return; }
      if (!meRes.ok) { setError('fetch'); return; }
      const coach = await meRes.json();

      const progsRes = await fetch(`/api/programs?coach_id=${coach.id}`);
      if (progsRes.ok) {
        setPrograms(await progsRes.json());
      } else {
        setError('fetch');
      }
    } catch {
      setError('fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const handleSaved = (program: ProgramData) => {
    toast('success', editProgram ? 'Modifié' : 'Créé', editProgram ? 'Programme modifié' : 'Programme créé avec succès');
    setEditProgram(null);
    fetchPrograms();
  };

  const handleEdit = (e: React.MouseEvent, program: ProgramData) => {
    e.preventDefault();
    e.stopPropagation();
    setEditProgram(program);
    setWizardOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, program: ProgramData) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(program.id!);
  };

  const handleDeleteConfirm = async (e: React.MouseEvent, program: ProgramData) => {
    e.preventDefault();
    e.stopPropagation();
    const res = await fetch(`/api/programs/${program.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast('success', 'Supprimé', 'Programme supprimé');
      fetchPrograms();
    } else {
      toast('error', 'Erreur', 'Impossible de supprimer le programme');
    }
    setDeletingId(null);
  };

  const handleDeleteCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(null);
  };

  return (
    <>
      <AppHeader title="Programmes" />
      <div className="p-4 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          {!loading && <p className="text-sm text-muted">{programs.length} programme{programs.length !== 1 ? 's' : ''}</p>}
          {loading && <div />}
          <Button onClick={() => { setEditProgram(null); setWizardOpen(true); }}>
            + Créer un programme
          </Button>
        </div>

        {/* Programs list */}
        {error ? (
          <EmptyState
            icon={error === 'auth' ? '🔒' : error === 'not-coach' ? '🚫' : '⚠️'}
            title={
              error === 'auth'
                ? 'Connectez-vous pour accéder à vos programmes'
                : error === 'not-coach'
                  ? 'Cette page est réservée aux coachs'
                  : 'Impossible de charger les programmes. Réessayez.'
            }
            description={
              error === 'auth'
                ? 'Vous devez être connecté pour gérer vos programmes.'
                : error === 'not-coach'
                  ? 'Seuls les comptes coach peuvent accéder à cette page.'
                  : 'Vérifiez votre connexion et réessayez.'
            }
            actionLabel={error === 'auth' ? 'Se connecter' : error === 'not-coach' ? undefined : 'Réessayer'}
            onAction={
              error === 'auth'
                ? () => (window.location.href = '/login')
                : error === 'not-coach'
                  ? undefined
                  : () => { setError(null); setLoading(true); fetchPrograms(); }
            }
          />
        ) : loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : programs.length === 0 ? (
          <EmptyState
            icon="📝"
            title="Aucun programme"
            description="Créez votre premier programme d'entraînement pour vos athlètes."
            actionLabel="Créer un programme"
            onAction={() => { setEditProgram(null); setWizardOpen(true); }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p) => (
              <Link
                key={p.id}
                href={`/coach/programs/${p.id}`}
                className="group relative overflow-hidden rounded-2xl border border-border bg-white transition-shadow hover:shadow-lg"
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
                  {/* Edit / Delete buttons */}
                  {deletingId === p.id ? (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                      <span className="flex-1 text-xs font-medium text-red-700">Supprimer ce programme ?</span>
                      <button
                        onClick={(e) => handleDeleteCancel(e)}
                        className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={(e) => handleDeleteConfirm(e, p)}
                        className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 transition"
                      >
                        Confirmer
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleEdit(e, p)}
                        className="text-xs font-medium text-gray-500 hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-brand-50 transition"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(e, p)}
                        className="text-xs font-medium text-gray-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ProgramWizardModal
        open={wizardOpen}
        onClose={() => { setWizardOpen(false); setEditProgram(null); }}
        onSaved={handleSaved}
        editProgram={editProgram}
      />
    </>
  );
}

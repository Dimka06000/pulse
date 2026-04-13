'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppHeader } from '@/components/pulse/app-header';
import { Button, EmptyState, SportGradient } from '@/components/pulse';
import { useToast } from '@/components/pulse/toast';
import { SPORT_LABELS, SPORT_EMOJIS, type Sport } from '@/lib/sports';
import { ProgramWizardModal, type ProgramData } from '@/components/coach/program-wizard-modal';

export default function CoachProgramsPage() {
  const [programs, setPrograms] = useState<ProgramData[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editProgram, setEditProgram] = useState<ProgramData | null>(null);
  const { toast } = useToast();

  const fetchPrograms = useCallback(async () => {
    try {
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

  const handleDelete = async (e: React.MouseEvent, program: ProgramData) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Supprimer ce programme ? Cette action est irréversible.')) return;

    const res = await fetch(`/api/programs/${program.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast('success', 'Supprimé', 'Programme supprimé');
      fetchPrograms();
    } else {
      toast('error', 'Erreur', 'Impossible de supprimer le programme');
    }
  };

  return (
    <>
      <AppHeader title="Programmes" />
      <div className="p-4 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted">{programs.length} programme{programs.length !== 1 ? 's' : ''}</p>
          <Button onClick={() => { setEditProgram(null); setWizardOpen(true); }}>
            + Créer un programme
          </Button>
        </div>

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
            onAction={() => { setEditProgram(null); setWizardOpen(true); }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p) => (
              <a
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
                  <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleEdit(e, p)}
                      className="flex-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, p)}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </a>
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

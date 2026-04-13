'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@oikos/coaching';
import {
  SPORT_LABELS,
  SPORT_EMOJIS,
  SPORT_GRADIENT_CLASSES,
  type Sport,
} from '@/lib/sports';
import {
  SessionWizardModal,
  type SessionTemplate,
} from '@/components/coach/session-wizard-modal';

const LEVELS: Record<string, string> = {
  all: 'Tous niveaux',
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

const TYPES: Record<string, { label: string; icon: string }> = {
  individual: { label: 'Individuel', icon: '👤' },
  group: { label: 'Groupe', icon: '👥' },
  online: { label: 'En ligne', icon: '💻' },
};

interface SessionsManagerProps {
  initialSessions: SessionTemplate[];
}

export function SessionsManager({ initialSessions }: SessionsManagerProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionTemplate[]>(initialSessions);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editSession, setEditSession] = useState<SessionTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function handleCreate() {
    setEditSession(null);
    setWizardOpen(true);
  }

  function handleEdit(session: SessionTemplate) {
    setEditSession(session);
    setWizardOpen(true);
  }

  function handleSaved(saved: SessionTemplate) {
    if (editSession) {
      setSessions((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
    } else {
      setSessions((prev) => [saved, ...prev]);
    }
    setEditSession(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/coaches/me/sessions?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        router.refresh();
      }
    } catch {
      // silent
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {sessions.length} séance{sessions.length !== 1 ? 's' : ''} configurée
          {sessions.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={handleCreate}>+ Nouvelle séance</Button>
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12 rounded-2xl border-2 border-dashed border-gray-200">
          <span className="text-4xl block mb-3">🏋️</span>
          <h3 className="font-semibold text-gray-900 mb-1">Aucune séance</h3>
          <p className="text-sm text-gray-500 mb-4">
            Créez votre première séance pour que vos clients puissent la réserver.
          </p>
          <Button onClick={handleCreate}>Créer une séance</Button>
        </div>
      )}

      <div className="space-y-3">
        {sessions.map((session) => {
          const sport = session.sport as Sport;
          const typeInfo = TYPES[session.type] || { label: session.type, icon: '📋' };

          return (
            <div
              key={session.id}
              className="rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Color bar */}
              <div
                className={`h-1.5 bg-gradient-to-r ${
                  SPORT_GRADIENT_CLASSES[sport] || 'from-gray-400 to-gray-500'
                }`}
              />

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0 mt-0.5">
                      {SPORT_EMOJIS[sport] || '⚡'}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {session.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {SPORT_LABELS[sport] || session.sport}
                      </p>
                      {session.description && (
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                          {session.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="inline-flex items-center gap-1 text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                        <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {LEVELS[session.level] || session.level}
                        </span>
                        <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {session.duration} min
                        </span>
                        {session.type === 'group' && session.max_participants > 1 && (
                          <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            Max {session.max_participants}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-lg font-bold text-brand-600">
                      {formatPrice(Math.round(session.price * 100))}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(session)}
                        className="text-xs text-gray-400 hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-brand-50 transition"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => setDeleteId(session.id)}
                        className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delete confirmation */}
              {deleteId === session.id && (
                <div className="border-t border-gray-100 bg-red-50 px-4 py-3 flex items-center justify-between">
                  <p className="text-sm text-red-700">Supprimer cette séance ?</p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(null)}
                    >
                      Annuler
                    </Button>
                    <button
                      onClick={() => handleDelete(session.id)}
                      disabled={deleting}
                      className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      {deleting ? 'Suppression...' : 'Confirmer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SessionWizardModal
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          setEditSession(null);
        }}
        onSaved={handleSaved}
        editSession={editSession}
      />
    </div>
  );
}

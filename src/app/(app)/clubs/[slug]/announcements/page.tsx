'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useClubsStore } from '@/stores/clubs';

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  profiles?: { first_name: string; avatar_url: string | null };
}

const COACH_ROLES = ['founder', 'coach_admin', 'coach'];

function SkeletonAnnouncement() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
      <div className="mb-3 h-4 w-1/3 rounded bg-gray-200" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-gray-200" />
        <div className="h-3 w-4/5 rounded bg-gray-200" />
      </div>
      <div className="mt-3 flex gap-2">
        <div className="h-3 w-20 rounded bg-gray-200" />
        <div className="h-3 w-16 rounded bg-gray-200" />
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ClubAnnouncementsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { fetchClub, activeClub, myRole, loading: clubLoading } = useClubsStore();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Post form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const clubRef = useRef<string | null>(null);

  // Load club from slug
  useEffect(() => {
    if (slug) {
      fetchClub(slug);
    }
  }, [slug, fetchClub]);

  // Fetch announcements once club is resolved
  useEffect(() => {
    if (!activeClub) return;
    if (clubRef.current === activeClub.id) return;
    clubRef.current = activeClub.id;

    loadAnnouncements(activeClub.id);
  }, [activeClub]);

  async function loadAnnouncements(clubId: string) {
    setListLoading(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/announcements`);
      if (res.status === 403) {
        setAccessDenied(true);
        setListLoading(false);
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur chargement des annonces');
      setAnnouncements(Array.isArray(json) ? json : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setListLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeClub || !title.trim() || !body.trim()) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/clubs/${activeClub.id}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: body.trim(), is_pinned: isPinned }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur publication');
      setTitle('');
      setBody('');
      setIsPinned(false);
      await loadAnnouncements(activeClub.id);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const isCoach = myRole ? COACH_ROLES.includes(myRole) : false;

  // Access denied
  if (accessDenied) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-lg font-semibold text-red-700">Accès réservé aux membres</p>
          <p className="mt-1 text-sm text-red-600">Rejoignez ce club pour consulter les annonces.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Annonces
        {activeClub && (
          <span className="ml-2 text-lg font-normal text-gray-500">— {activeClub.name}</span>
        )}
      </h1>

      {/* Post form — coach+ only */}
      {isCoach && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Nouvelle annonce</h2>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de l'annonce"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Contenu de l'annonce..."
            rows={4}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pin-toggle"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="pin-toggle" className="text-sm text-gray-600 cursor-pointer">
              Épingler cette annonce
            </label>
          </div>
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !title.trim() || !body.trim()}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Publication...' : 'Publier'}
            </button>
          </div>
        </form>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Announcements list */}
      {listLoading || clubLoading ? (
        <div className="space-y-4">
          <SkeletonAnnouncement />
          <SkeletonAnnouncement />
          <SkeletonAnnouncement />
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          <p className="text-base font-medium">Aucune annonce</p>
          <p className="mt-1 text-sm">Les annonces des coachs apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`rounded-xl border bg-white p-5 ${ann.is_pinned ? 'border-brand-300 bg-brand-50' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold text-gray-900 leading-snug">{ann.title}</h3>
                {ann.is_pinned && (
                  <span className="shrink-0 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                    Épinglé
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{ann.content}</p>

              <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                {ann.profiles?.first_name && (
                  <span>{ann.profiles.first_name}</span>
                )}
                <span>·</span>
                <span>{formatDate(ann.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

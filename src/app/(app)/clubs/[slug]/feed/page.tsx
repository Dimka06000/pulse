'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useClubsStore } from '@/stores/clubs';

interface FeedPost {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: { first_name: string; last_name: string; avatar_url: string | null };
  kudos?: { count: number }[];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function SkeletonPost() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded bg-gray-200" />
          <div className="h-3 w-20 rounded bg-gray-200" />
          <div className="mt-3 space-y-1">
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-3/4 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClubFeedPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { fetchClub, activeClub, myRole, loading: clubLoading } = useClubsStore();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const clubRef = useRef<string | null>(null);

  // Load club from slug
  useEffect(() => {
    if (slug) {
      fetchClub(slug);
    }
  }, [slug, fetchClub]);

  // Fetch feed once club is resolved
  useEffect(() => {
    if (!activeClub) return;
    if (clubRef.current === activeClub.id) return;
    clubRef.current = activeClub.id;

    loadFeed(activeClub.id);
  }, [activeClub]);

  async function loadFeed(clubId: string) {
    setFeedLoading(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/feed`);
      if (res.status === 403) {
        setAccessDenied(true);
        setFeedLoading(false);
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur chargement du fil');
      setPosts(Array.isArray(json) ? json : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFeedLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeClub || !content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${activeClub.id}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur publication');
      setContent('');
      await loadFeed(activeClub.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Access denied
  if (accessDenied) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-lg font-semibold text-red-700">Accès réservé aux membres</p>
          <p className="mt-1 text-sm text-red-600">Rejoignez ce club pour accéder au fil d&apos;activité.</p>
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

  const isMember = !!myRole;

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Fil d&apos;activité
        {activeClub && (
          <span className="ml-2 text-lg font-normal text-gray-500">— {activeClub.name}</span>
        )}
      </h1>

      {/* Post form — members only */}
      {isMember && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Partagez une activité, un résultat, une pensée..."
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Publication...' : 'Publier'}
            </button>
          </div>
        </form>
      )}

      {/* Feed list */}
      {feedLoading || clubLoading ? (
        <div className="space-y-4">
          <SkeletonPost />
          <SkeletonPost />
          <SkeletonPost />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          <p className="text-base font-medium">Aucune activité pour le moment</p>
          <p className="mt-1 text-sm">Soyez le premier à partager quelque chose !</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const firstName = post.profiles?.first_name ?? '';
            const lastName = post.profiles?.last_name ?? '';
            const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Membre';
            const initials = (firstName[0] ?? '') + (lastName[0] ?? '') || '?';
            const kudosCount = post.kudos?.[0]?.count ?? 0;

            return (
              <div key={post.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 uppercase">
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-gray-900">{fullName}</span>
                      <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-gray-700 whitespace-pre-wrap">{post.content}</p>

                    {kudosCount > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                        <span>👏</span>
                        <span>{kudosCount} kudos</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

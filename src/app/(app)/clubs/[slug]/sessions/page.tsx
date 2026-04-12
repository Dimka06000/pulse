'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionTemplate {
  id: string;
  title: string;
  price_cents: number;
  duration_minutes: number | null;
  sport: string | null;
  description: string | null;
  coach_id: string;
  coach_name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
  if (cents === 0) return 'Gratuit';
  const amount = cents / 100;
  return amount % 1 === 0
    ? `${amount}€`
    : `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`;
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-5 w-2/3 rounded bg-gray-200" />
          <div className="h-4 w-1/3 rounded bg-gray-200" />
          <div className="h-3 w-1/2 rounded bg-gray-200" />
        </div>
        <div className="h-8 w-20 rounded-lg bg-gray-200 shrink-0" />
      </div>
    </div>
  );
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({ session }: { session: SessionTemplate }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{session.title}</h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">
              Coach : <span className="font-medium text-gray-700">{session.coach_name}</span>
            </span>
            {session.sport && (
              <>
                <span className="text-gray-300">·</span>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 border border-brand-200">
                  {session.sport}
                </span>
              </>
            )}
            {session.duration_minutes != null && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-500">{session.duration_minutes} min</span>
              </>
            )}
          </div>

          {session.description && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{session.description}</p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-brand-600">{formatPrice(session.price_cents)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClubSessionsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [clubId, setClubId] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string>('');
  const [sessions, setSessions] = useState<SessionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState<boolean | null>(null);

  // Resolve slug → club
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/clubs/${slug}?by=slug`)
      .then((r) => r.json())
      .then((json) => {
        if (json.id) {
          setClubId(json.id);
          setClubName(json.name ?? '');
        } else {
          setError('Club introuvable');
          setLoading(false);
        }
      })
      .catch(() => {
        setError('Erreur lors du chargement du club');
        setLoading(false);
      });
  }, [slug]);

  // Load sessions once we have the club id
  useEffect(() => {
    if (!clubId) return;
    setLoading(true);
    setError(null);

    fetch(`/api/clubs/${clubId}/sessions`)
      .then(async (res) => {
        const json = await res.json();
        if (res.status === 403) {
          setIsMember(false);
          setSessions([]);
          return;
        }
        if (!res.ok) throw new Error(json.error ?? 'Erreur chargement des séances');
        setIsMember(true);
        setSessions(Array.isArray(json) ? json : []);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [clubId]);

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/clubs/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Séances</h1>
        </div>
        {clubName && (
          <span className="text-sm text-gray-500 truncate">{clubName}</span>
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Not a member guard ─────────────────────────────────────────────────── */}
      {isMember === false && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <span className="text-5xl">🔒</span>
          <div>
            <p className="font-semibold text-gray-700">Accès réservé aux membres</p>
            <p className="mt-1 text-sm text-gray-500">
              Vous devez être membre du club pour accéder aux séances.
            </p>
          </div>
          <Link
            href={`/clubs/${slug}/join`}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            Rejoindre le club
          </Link>
        </div>
      )}

      {/* ── Loading ────────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────────── */}
      {!loading && isMember && sessions.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl">🏋️</span>
          <p className="mt-4 font-semibold text-gray-700">Aucune séance disponible</p>
          <p className="mt-1 text-sm text-gray-500">
            Les séances proposées par les coachs du club apparaîtront ici.
          </p>
        </div>
      )}

      {/* ── Sessions list ──────────────────────────────────────────────────────── */}
      {!loading && isMember && sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

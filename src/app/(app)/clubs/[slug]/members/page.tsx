'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { ClubMember } from '@/stores/clubs';

const ROLE_LABELS: Record<string, string> = {
  founder: 'Fondateur',
  coach_admin: 'Coach Admin',
  coach: 'Coach',
  captain: 'Capitaine',
  member: 'Membre',
};

const ROLE_COLORS: Record<string, string> = {
  founder: 'bg-yellow-100 text-yellow-700',
  coach_admin: 'bg-purple-100 text-purple-700',
  coach: 'bg-violet-100 text-violet-700',
  captain: 'bg-blue-100 text-blue-700',
  member: 'bg-gray-100 text-gray-600',
};

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function formatJoinedDate(iso: string): string {
  const d = new Date(iso);
  return `Membre depuis ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

function MemberAvatar({ member }: { member: ClubMember }) {
  const first = member.profiles?.first_name ?? '';
  const last = member.profiles?.last_name ?? '';
  const initial = (first || last || '?').charAt(0).toUpperCase();

  if (member.profiles?.avatar_url) {
    return (
      <img
        src={member.profiles.avatar_url}
        alt={`${first} ${last}`}
        className="h-12 w-12 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
      <span className="text-lg font-semibold text-brand-600">{initial}</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse flex items-center gap-4">
      <div className="h-12 w-12 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 rounded bg-gray-200" />
        <div className="h-3 w-1/4 rounded-full bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-200" />
      </div>
    </div>
  );
}

export default function ClubMembersPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [clubId, setClubId] = useState<string | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve slug → clubId
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/clubs/${slug}?by=slug`)
      .then((r) => r.json())
      .then((json) => {
        if (json.id) setClubId(json.id);
        else setError('Club introuvable');
      })
      .catch(() => setError('Erreur lors du chargement du club'));
  }, [slug]);

  useEffect(() => {
    if (!clubId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/clubs/${clubId}/members`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Erreur chargement des membres');
        setMembers(Array.isArray(json) ? json : []);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [clubId]);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Membres</h1>
        {!loading && (
          <span className="text-sm text-gray-500">{members.length} membre{members.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl">👥</span>
          <p className="mt-3 font-semibold text-gray-700">Aucun membre</p>
          <p className="mt-1 text-sm text-gray-500">
            Les membres du club apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => {
            const first = member.profiles?.first_name ?? '';
            const last = member.profiles?.last_name ?? '';
            const name = [first, last].filter(Boolean).join(' ') || 'Membre';
            const roleLabel = ROLE_LABELS[member.role] ?? member.role;
            const roleColor = ROLE_COLORS[member.role] ?? 'bg-gray-100 text-gray-600';

            return (
              <div
                key={member.id}
                className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-4"
              >
                <MemberAvatar member={member} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{name}</p>
                  <span
                    className={`mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColor}`}
                  >
                    {roleLabel}
                  </span>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatJoinedDate(member.joined_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

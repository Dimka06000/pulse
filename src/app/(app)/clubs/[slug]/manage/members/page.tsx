'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Member {
  id: string;
  club_id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  profiles?: { first_name: string; last_name: string; avatar_url: string | null };
}

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

const EDITABLE_ROLES = ['member', 'captain', 'coach', 'coach_admin'];

function MemberAvatar({ member }: { member: Member }) {
  const first = member.profiles?.first_name ?? '';
  const last = member.profiles?.last_name ?? '';
  const initial = (first || last || '?').charAt(0).toUpperCase();

  if (member.profiles?.avatar_url) {
    return (
      <img
        src={member.profiles.avatar_url}
        alt={`${first} ${last}`}
        className="h-10 w-10 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
      <span className="text-sm font-semibold text-brand-600">{initial}</span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
      <div className="h-10 w-10 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 rounded bg-gray-200" />
        <div className="h-3 w-1/4 rounded bg-gray-200" />
      </div>
      <div className="h-8 w-24 rounded-lg bg-gray-200" />
    </div>
  );
}

export default function ManageMembersPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [clubId, setClubId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pending, setPending] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/clubs/${slug}?by=slug`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.id) { setError('Club introuvable'); return; }
        setClubId(json.id);
      })
      .catch(() => setError('Erreur lors du chargement du club'));
  }, [slug]);

  const loadMembers = () => {
    if (!clubId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/clubs/${clubId}/members`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/clubs/${clubId}/members?status=pending`).then((r) => r.ok ? r.json() : []),
    ])
      .then(([active, pend]) => {
        setMembers(Array.isArray(active) ? active : []);
        setPending(Array.isArray(pend) ? pend : []);
      })
      .catch(() => setError('Erreur lors du chargement des membres'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMembers(); }, [clubId]);

  const setLoaderFor = (uid: string, val: boolean) =>
    setActionLoading((prev) => ({ ...prev, [uid]: val }));

  const handleApprove = async (uid: string) => {
    if (!clubId) return;
    setLoaderFor(uid, true);
    await fetch(`/api/clubs/${clubId}/members/${uid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    setLoaderFor(uid, false);
    loadMembers();
  };

  const handleReject = async (uid: string) => {
    if (!clubId) return;
    setLoaderFor(uid, true);
    await fetch(`/api/clubs/${clubId}/members/${uid}`, { method: 'DELETE' });
    setLoaderFor(uid, false);
    loadMembers();
  };

  const handleRoleChange = async (uid: string, role: string) => {
    if (!clubId) return;
    setLoaderFor(uid, true);
    await fetch(`/api/clubs/${clubId}/members/${uid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    setLoaderFor(uid, false);
    loadMembers();
  };

  const handleSuspend = async (uid: string, currentStatus: string) => {
    if (!clubId) return;
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    setLoaderFor(uid, true);
    await fetch(`/api/clubs/${clubId}/members/${uid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setLoaderFor(uid, false);
    loadMembers();
  };

  const handleKick = async (uid: string) => {
    if (!clubId) return;
    if (!confirm('Exclure ce membre du club ?')) return;
    setLoaderFor(uid, true);
    await fetch(`/api/clubs/${clubId}/members/${uid}`, { method: 'DELETE' });
    setLoaderFor(uid, false);
    loadMembers();
  };

  const getMemberName = (m: Member) => {
    const first = m.profiles?.first_name ?? '';
    const last = m.profiles?.last_name ?? '';
    return [first, last].filter(Boolean).join(' ') || 'Membre';
  };

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gérer les membres</h1>
        <Link href={`/clubs/${slug}/manage`} className="text-sm text-brand-600 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Pending requests */}
      {(loading || pending.length > 0) && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-700">
            Demandes en attente {!loading && `(${pending.length})`}
          </h2>
          {loading ? (
            <div className="space-y-3"><SkeletonRow /><SkeletonRow /></div>
          ) : (
            <div className="space-y-3">
              {pending.map((m) => (
                <div key={m.user_id} className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                  <MemberAvatar member={m} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{getMemberName(m)}</p>
                    <p className="text-xs text-gray-500">Demande en attente</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(m.user_id)}
                      disabled={actionLoading[m.user_id]}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Accepter
                    </button>
                    <button
                      onClick={() => handleReject(m.user_id)}
                      disabled={actionLoading[m.user_id]}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Active members */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-700">
          Membres actifs {!loading && `(${members.length})`}
        </h2>
        {loading ? (
          <div className="space-y-3">
            <SkeletonRow /><SkeletonRow /><SkeletonRow />
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">Aucun membre actif.</p>
        ) : (
          <div className="space-y-3">
            {members.map((m) => {
              const isFounder = m.role === 'founder';
              const isSuspended = m.status === 'suspended';
              return (
                <div
                  key={m.user_id}
                  className={`flex items-center gap-3 rounded-xl border bg-white p-4 ${isSuspended ? 'border-red-200 opacity-70' : 'border-gray-200'}`}
                >
                  <MemberAvatar member={m} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{getMemberName(m)}</p>
                    <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[m.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                    {isSuspended && (
                      <span className="ml-2 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Suspendu</span>
                    )}
                  </div>
                  {!isFounder && (
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={m.role}
                        disabled={actionLoading[m.user_id]}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                        className="rounded-lg border border-gray-300 py-1 pl-2 pr-6 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {EDITABLE_ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleSuspend(m.user_id, m.status)}
                        disabled={actionLoading[m.user_id]}
                        className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                      >
                        {isSuspended ? 'Réactiver' : 'Suspendre'}
                      </button>
                      <button
                        onClick={() => handleKick(m.user_id)}
                        disabled={actionLoading[m.user_id]}
                        className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        Exclure
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

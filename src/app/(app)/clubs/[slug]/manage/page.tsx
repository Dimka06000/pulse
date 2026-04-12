'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface Stats {
  membersActive: number;
  membersPending: number;
  eventsUpcoming: number;
  plansActive: number;
}

const QUICK_LINKS = [
  { href: 'manage/members', label: 'Gérer les membres', icon: '👥' },
  { href: 'manage/events', label: 'Créer un événement', icon: '📅' },
  { href: 'manage/plans', label: 'Gérer les formules', icon: '💳' },
  { href: 'manage/settings', label: 'Paramètres', icon: '⚙️' },
];

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl border p-4 bg-white shadow-sm ${color}`}>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200" />
      ))}
    </div>
  );
}

export default function ClubManageDashboard() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [clubId, setClubId] = useState<string | null>(null);
  const [clubName, setClubName] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resolve slug → id + admin guard
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/clubs/${slug}?by=slug`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.id) { setError('Club introuvable'); return; }
        setClubId(json.id);
        setClubName(json.name ?? '');
      })
      .catch(() => setError('Erreur lors du chargement'));
  }, [slug]);

  // Fetch stats once we have club id
  useEffect(() => {
    if (!clubId) return;

    const fetchAll = async () => {
      try {
        const [membersRes, eventsRes, plansRes] = await Promise.all([
          fetch(`/api/clubs/${clubId}/members`),
          fetch(`/api/clubs/${clubId}/events`),
          fetch(`/api/clubs/${clubId}/plans`),
        ]);

        const [members, events, plans] = await Promise.all([
          membersRes.ok ? membersRes.json() : [],
          eventsRes.ok ? eventsRes.json() : [],
          plansRes.ok ? plansRes.json() : [],
        ]);

        // Fetch pending members separately
        const pendingRes = await fetch(`/api/clubs/${clubId}/members?status=pending`);
        const pending = pendingRes.ok ? await pendingRes.json() : [];

        setStats({
          membersActive: Array.isArray(members) ? members.length : 0,
          membersPending: Array.isArray(pending) ? pending.length : 0,
          eventsUpcoming: Array.isArray(events) ? events.length : 0,
          plansActive: Array.isArray(plans) ? plans.length : 0,
        });
      } catch {
        setStats({ membersActive: 0, membersPending: 0, eventsUpcoming: 0, plansActive: 0 });
      }
    };

    fetchAll();
  }, [clubId]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administration du club</h1>
        {clubName && <p className="mt-1 text-sm text-gray-500">{clubName}</p>}
      </div>

      {/* Stats */}
      {stats === null ? (
        <SkeletonStats />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Membres actifs" value={stats.membersActive} color="border-brand-200" />
          <StatCard label="Demandes en attente" value={stats.membersPending} color="border-yellow-200" />
          <StatCard label="Événements à venir" value={stats.eventsUpcoming} color="border-blue-200" />
          <StatCard label="Abonnements actifs" value={stats.plansActive} color="border-green-200" />
        </div>
      )}

      {/* Quick links */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-700">Actions rapides</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={`/clubs/${slug}/${link.href}`}
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-3xl">{link.icon}</span>
              <span className="text-xs font-medium text-gray-700 leading-tight">{link.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Back to club */}
      <Link
        href={`/clubs/${slug}`}
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        ← Retour à la page du club
      </Link>
    </div>
  );
}

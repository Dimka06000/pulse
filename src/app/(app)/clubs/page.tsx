'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useClubsStore } from '@/stores/clubs';
import { useAuthStore } from '@/stores/auth';
import { ClubCard } from '@/components/clubs/club-card';
import { EmptyState } from '@/components/pulse/empty-state';

const SPORTS = [
  'Running',
  'CrossFit',
  'Musculation',
  'Yoga',
  'Natation',
  'Cyclisme',
  'Trail',
  'Arts martiaux',
  'Danse',
  'Football',
];

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 shrink-0 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 rounded bg-gray-200" />
          <div className="h-3 w-1/4 rounded bg-gray-200" />
          <div className="flex gap-1 mt-2">
            <div className="h-5 w-16 rounded-full bg-gray-200" />
            <div className="h-5 w-16 rounded-full bg-gray-200" />
          </div>
        </div>
        <div className="shrink-0 space-y-2 text-right">
          <div className="h-6 w-10 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded-full bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

export default function ClubsPage() {
  const { clubs: rawClubs, loading, fetchClubs } = useClubsStore();
  const clubs = rawClubs || [];
  const { userRole } = useAuthStore();

  const [search, setSearch] = useState('');
  const [sport, setSport] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.q = search;
    if (sport) params.sport = sport;
    if (city) params.city = city;
    fetchClubs(params);
  }, [search, sport, city, fetchClubs]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Clubs</h1>
        {userRole === 'coach' && (
          <Link
            href="/clubs/create"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            Créer un club
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Rechercher un club..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <select
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Tous les sports</option>
          {SPORTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Ville..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full sm:w-40 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : clubs.length === 0 ? (
        <EmptyState
          icon="🏟️"
          title="Aucun club trouvé"
          description="Modifiez vos filtres ou créez votre propre club !"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect } from 'react';
import { CoachFilters, type SearchFilters } from '@/components/coaches/coach-filters';
import { CoachCard } from '@/components/coaches/coach-card';
import { api } from '@/lib/api';
import type { CoachSearchResult } from '@oikos/coaching';

const defaultFilters: SearchFilters = {
  sport: '',
  priceRange: [0, 200],
  minRating: 0,
  radiusKm: 50,
  sortBy: 'relevance',
};

export default function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [coaches, setCoaches] = useState<CoachSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);

    const params = new URLSearchParams();
    if (filters.sport) params.set('sport', filters.sport);
    if (filters.priceRange[0] > 0) params.set('priceMin', String(filters.priceRange[0]));
    if (filters.priceRange[1] < 200) params.set('priceMax', String(filters.priceRange[1]));
    if (filters.minRating > 0) params.set('minRating', String(filters.minRating));
    if (filters.lat != null) params.set('lat', String(filters.lat));
    if (filters.lng != null) params.set('lng', String(filters.lng));
    if (filters.radiusKm) params.set('radiusKm', String(filters.radiusKm));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);

    try {
      const res = await api.get<{ coaches: CoachSearchResult[] }>(
        `/api/coaches?${params.toString()}`
      );
      setCoaches(res.coaches);
    } catch {
      setCoaches([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Auto-search on mount
  useEffect(() => {
    doSearch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      {/* Filters sidebar */}
      <aside className="w-full shrink-0 md:w-72">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Filtres</h2>
          <CoachFilters
            filters={filters}
            onChange={setFilters}
            onSearch={doSearch}
          />
        </div>
      </aside>

      {/* Results */}
      <main className="flex-1">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Trouver un coach</h1>
          {searched && !loading && (
            <span className="text-sm text-gray-500">
              {coaches.length} resultat{coaches.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl bg-gray-100"
              />
            ))}
          </div>
        ) : coaches.length > 0 ? (
          <div className="space-y-4">
            {coaches.map((coach) => (
              <CoachCard key={coach.id} coach={coach} />
            ))}
          </div>
        ) : searched ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500">
              Aucun coach trouve avec ces criteres.
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Essayez d&apos;elargir vos filtres.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}

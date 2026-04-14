'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/pulse/app-header';
import { EmptyState } from '@/components/pulse/empty-state';
import { Badge } from '@/components/pulse/badge';
import { Skeleton } from '@/components/pulse/skeleton';
import { useAuthStore } from '@/stores/auth';
import { SPORT_EMOJIS, SPORT_LABELS, SPORTS, SPORT_GRADIENTS, type Sport } from '@/lib/sports';
import Link from 'next/link';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Program {
  id: string;
  title: string;
  description: string;
  sport: string;
  level: string;
  duration_weeks: number;
  price: number;
  is_published: boolean;
  cover_image_url: string | null;
  coach_profiles: { display_name: string; avatar_url: string | null } | null;
  program_enrollments: Array<{ count: number }>;
}

const LEVEL_LABELS: Record<string, string> = {
  all: 'Tous niveaux',
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

const SORT_OPTIONS = [
  { value: 'popular', label: 'Populaire' },
  { value: 'recent', label: 'Récent' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
];

const DURATION_OPTIONS = [
  { label: '1-4 sem', min: 1, max: 4 },
  { label: '5-8 sem', min: 5, max: 8 },
  { label: '9-12 sem', min: 9, max: 12 },
  { label: '12+ sem', min: 13, max: undefined },
];

const PAGE_SIZE = 12;

function ProgramCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <Skeleton className="h-36 rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-1.5 pt-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-9 w-full mt-2" />
      </div>
    </div>
  );
}

function ProgramCard({
  prog,
  isEnrolled,
  enrolling,
  onEnroll,
  pushingGarmin,
  garminConnected,
  onPushGarmin,
}: {
  prog: Program;
  isEnrolled: boolean;
  enrolling: boolean;
  onEnroll: () => void;
  pushingGarmin: boolean;
  garminConnected: boolean;
  onPushGarmin: () => void;
}) {
  const sportEmoji = SPORT_EMOJIS[prog.sport as Sport] || '⚡';
  const sportLabel = SPORT_LABELS[prog.sport as Sport] || prog.sport;
  const gradient = SPORT_GRADIENTS[prog.sport as Sport] || SPORT_GRADIENTS['autre'];
  const enrollCount = prog.program_enrollments?.[0]?.count ?? 0;
  const coachName = prog.coach_profiles?.display_name || 'Coach';
  const coachAvatar = prog.coach_profiles?.avatar_url;

  return (
    <Link href={`/explore/programs/${prog.id}`} className="group block rounded-2xl border border-border bg-white overflow-hidden transition hover:shadow-lg hover:-translate-y-0.5">
      {/* Cover */}
      <div
        className="relative h-36 flex items-end"
        style={{ background: prog.cover_image_url ? undefined : gradient }}
      >
        {prog.cover_image_url && (
          <img src={prog.cover_image_url} alt={prog.title} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="relative z-10 px-4 pb-3 flex items-end gap-3 w-full">
          <span className="text-2xl drop-shadow">{sportEmoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white drop-shadow truncate">{prog.title}</h3>
            <p className="text-xs text-white/80 truncate">{prog.duration_weeks} semaines</p>
          </div>
          <div className="text-right">
            {prog.price === 0 ? (
              <span className="text-xs font-bold text-emerald-300">Gratuit</span>
            ) : (
              <span className="text-xs font-bold text-white">{prog.price}€</span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Coach */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center overflow-hidden flex-shrink-0">
            {coachAvatar ? (
              <img src={coachAvatar} alt={coachName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-white">{coachName[0]?.toUpperCase()}</span>
            )}
          </div>
          <span className="text-xs text-muted truncate">{coachName}</span>
          {enrollCount > 0 && (
            <span className="ml-auto text-[10px] text-muted flex-shrink-0">{enrollCount} inscrits</span>
          )}
        </div>

        {/* Description */}
        {prog.description && (
          <p className="text-xs text-muted mb-3 line-clamp-2">{prog.description}</p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge variant="sport">{sportLabel}</Badge>
          <Badge variant="info">{LEVEL_LABELS[prog.level] || prog.level}</Badge>
          <Badge variant="success">{prog.duration_weeks} sem.</Badge>
        </div>

        {/* CTA */}
        <div
          className="space-y-2"
          onClick={(e) => e.preventDefault()}
        >
          {isEnrolled ? (
            <>
              <div className="rounded-xl bg-green-50 py-2 text-center text-sm font-semibold text-green-700">
                ✓ Inscrit
              </div>
              {garminConnected && (
                <button
                  onClick={onPushGarmin}
                  disabled={pushingGarmin}
                  className="w-full rounded-xl border border-blue-200 bg-blue-50 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                >
                  {pushingGarmin ? 'Envoi...' : '⌚ Envoyer sur ma Garmin'}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={onEnroll}
              disabled={enrolling}
              className="w-full rounded-xl bg-brand-500 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              {enrolling ? 'Inscription...' : prog.price > 0 ? `Acheter ${prog.price}€` : "S'inscrire"}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function ExploreProgramsPage() {
  const { userId } = useAuthStore();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [pushingGarmin, setPushingGarmin] = useState<string | null>(null);
  const [garminConnected, setGarminConnected] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedSports, setSelectedSports] = useState<Sport[]>([]);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [sort, setSort] = useState('popular');

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Garmin check
  useEffect(() => {
    fetch('/api/connectors')
      .then(r => r.ok ? r.json() : { connections: [] })
      .then(d => {
        const conns = d.connections || [];
        setGarminConnected(conns.some((c: any) => c.provider === 'garmin' && c.is_active));
      })
      .catch(() => {});
  }, []);

  const buildUrl = useCallback((pageOffset: number) => {
    const p = new URLSearchParams();
    p.set('sort', sort);
    p.set('limit', String(PAGE_SIZE));
    p.set('offset', String(pageOffset));
    if (search) p.set('search', search);
    if (selectedSports.length === 1) p.set('sport', selectedSports[0]);
    if (selectedLevel !== 'all') p.set('level', selectedLevel);
    if (selectedDuration !== null) {
      const dur = DURATION_OPTIONS[selectedDuration];
      p.set('min_duration', String(dur.min));
      if (dur.max) p.set('max_duration', String(dur.max));
    }
    if (priceFilter === 'free') { p.set('min_price', '0'); p.set('max_price', '0'); }
    if (priceFilter === 'paid') p.set('min_price', '0.01');
    return `/api/programs?${p.toString()}`;
  }, [search, selectedSports, selectedLevel, selectedDuration, priceFilter, sort]);

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    setOffset(0);
    try {
      const res = await fetch(buildUrl(0));
      const data = res.ok ? await res.json() : [];
      const list = Array.isArray(data) ? data : [];
      setPrograms(list);
      setHasMore(list.length === PAGE_SIZE);
    } catch {
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const loadMore = async () => {
    setLoadingMore(true);
    const newOffset = offset + PAGE_SIZE;
    try {
      const res = await fetch(buildUrl(newOffset));
      const data = res.ok ? await res.json() : [];
      const list = Array.isArray(data) ? data : [];
      setPrograms(prev => [...prev, ...list]);
      setOffset(newOffset);
      setHasMore(list.length === PAGE_SIZE);
    } catch { /* ignore */ }
    setLoadingMore(false);
  };

  const handleEnroll = async (programId: string) => {
    if (!userId) return;
    setEnrolling(programId);
    try {
      const res = await fetch(`/api/programs/${programId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok || res.status === 409) {
        setEnrolled(prev => new Set(prev).add(programId));
      }
    } catch { /* ignore */ }
    setEnrolling(null);
  };

  const handlePushGarmin = async (programId: string) => {
    setPushingGarmin(programId);
    try {
      const res = await fetch(`/api/programs/${programId}/push-garmin`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`${data.pushed} séances envoyées sur votre Garmin !`);
      } else {
        alert(data.error || 'Erreur');
      }
    } catch { /* ignore */ }
    setPushingGarmin(null);
  };

  const toggleSport = (sport: Sport) => {
    setSelectedSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    );
  };

  // Active filter count
  const activeFilters: string[] = [];
  if (search) activeFilters.push(`"${search}"`);
  selectedSports.forEach(s => activeFilters.push(SPORT_LABELS[s]));
  if (selectedLevel !== 'all') activeFilters.push(LEVEL_LABELS[selectedLevel]);
  if (selectedDuration !== null) activeFilters.push(DURATION_OPTIONS[selectedDuration].label);
  if (priceFilter !== 'all') activeFilters.push(priceFilter === 'free' ? 'Gratuit' : 'Payant');

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setSelectedSports([]);
    setSelectedLevel('all');
    setSelectedDuration(null);
    setPriceFilter('all');
    setSort('popular');
  };

  return (
    <>
      <AppHeader title="Programmes" />
      <div className="p-4 md:p-8 pb-24 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="hidden md:block text-2xl font-extrabold text-text">Programmes d&apos;entraînement</h1>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="ml-auto rounded-xl border border-border bg-white px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
          <input
            type="text"
            placeholder="Rechercher un programme..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full rounded-xl border border-border bg-white pl-9 pr-4 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter chips row */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Sport */}
          {SPORTS.map(sport => (
            <button
              key={sport}
              onClick={() => toggleSport(sport)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                selectedSports.includes(sport)
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-muted border-border hover:border-brand-400 hover:text-text'
              }`}
            >
              <span>{SPORT_EMOJIS[sport]}</span>
              {SPORT_LABELS[sport]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {/* Level */}
          {['all', 'beginner', 'intermediate', 'advanced'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                selectedLevel === lvl
                  ? 'bg-violet-500 text-white border-violet-500'
                  : 'bg-white text-muted border-border hover:border-violet-400 hover:text-text'
              }`}
            >
              {LEVEL_LABELS[lvl]}
            </button>
          ))}

          {/* Duration */}
          {DURATION_OPTIONS.map((dur, idx) => (
            <button
              key={dur.label}
              onClick={() => setSelectedDuration(selectedDuration === idx ? null : idx)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                selectedDuration === idx
                  ? 'bg-cyan-500 text-white border-cyan-500'
                  : 'bg-white text-muted border-border hover:border-cyan-400 hover:text-text'
              }`}
            >
              {dur.label}
            </button>
          ))}

          {/* Price */}
          {(['all', 'free', 'paid'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPriceFilter(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                priceFilter === p
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-muted border-border hover:border-emerald-400 hover:text-text'
              }`}
            >
              {p === 'all' ? 'Tout prix' : p === 'free' ? 'Gratuit' : 'Payant'}
            </button>
          ))}
        </div>

        {/* Active filters */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs text-muted">Filtres actifs :</span>
            {activeFilters.map(f => (
              <span key={f} className="flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 text-xs px-2.5 py-0.5 font-medium border border-brand-100">
                {f}
              </span>
            ))}
            <button onClick={clearFilters} className="text-xs text-muted hover:text-text underline">
              Tout effacer
            </button>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProgramCardSkeleton key={i} />
            ))}
          </div>
        ) : programs.length === 0 ? (
          <EmptyState
            icon="📝"
            title="Aucun programme trouvé"
            description="Essayez de modifier vos filtres ou revenez plus tard."
            actionLabel={activeFilters.length > 0 ? 'Effacer les filtres' : undefined}
            onAction={activeFilters.length > 0 ? clearFilters : undefined}
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {programs.map(prog => (
                <ProgramCard
                  key={prog.id}
                  prog={prog}
                  isEnrolled={enrolled.has(prog.id)}
                  enrolling={enrolling === prog.id}
                  onEnroll={() => handleEnroll(prog.id)}
                  pushingGarmin={pushingGarmin === prog.id}
                  garminConnected={garminConnected}
                  onPushGarmin={() => handlePushGarmin(prog.id)}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-xl border border-border bg-white px-6 py-2.5 text-sm font-semibold text-text transition hover:bg-surface disabled:opacity-50"
                >
                  {loadingMore ? 'Chargement...' : 'Charger plus'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppHeader } from '@/components/pulse/app-header';
import { EmptyState } from '@/components/pulse/empty-state';
import { Skeleton } from '@/components/pulse/skeleton';
import { useAuthStore } from '@/stores/auth';
import { SPORT_EMOJIS, SPORT_LABELS, SPORTS, type Sport } from '@/lib/sports';
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
  coach_profiles: { display_name: string } | null;
  program_enrollments: Array<{ count: number }>;
}

interface EventResult {
  name: string;
  sport: string;
  distanceKm: number | null;
  terrainType: string;
  location: string;
  date: string;
  elevationM?: number;
  source: string;
}

const LEVEL_LABELS: Record<string, string> = {
  all: 'Tous niveaux',
  beginner: 'Debutant',
  intermediate: 'Intermediaire',
  advanced: 'Avance',
};

const SORT_OPTIONS = [
  { value: 'popular', label: 'Populaire' },
  { value: 'recent', label: 'Recent' },
  { value: 'price_asc', label: 'Prix ↑' },
  { value: 'price_desc', label: 'Prix ↓' },
];

const DURATION_OPTIONS = [
  { label: '1-4 sem', min: 1, max: 4 },
  { label: '5-8 sem', min: 5, max: 8 },
  { label: '9-12 sem', min: 9, max: 12 },
  { label: '12+ sem', min: 13, max: undefined },
];

const PAGE_SIZE = 12;

// Popular events
const POPULAR_EVENTS = [
  { name: 'Marathon de Paris', emoji: '🏃', sport: 'running', date: '11 avr. 2027', location: 'Paris', category: 'marathon' },
  { name: 'UTMB', emoji: '⛰️', sport: 'trail', date: '28 aout 2026', location: 'Chamonix', category: 'trail' },
  { name: 'Ironman Nice', emoji: '🏊', sport: 'triathlon', date: '28 juin 2026', location: 'Nice', category: 'triathlon' },
  { name: 'Semi de Paris', emoji: '🏃', sport: 'running', date: '7 mars 2027', location: 'Paris', category: 'marathon' },
  { name: 'Trail des Templiers', emoji: '⛰️', sport: 'trail', date: '18 oct. 2026', location: 'Millau', category: 'trail' },
  { name: 'French Throwdown', emoji: '🏋️', sport: 'crossfit', date: '30 mai 2026', location: 'Paris', category: 'crossfit' },
  { name: 'Diagonale des Fous', emoji: '⛰️', sport: 'trail', date: '22 oct. 2026', location: 'La Reunion', category: 'trail' },
  { name: 'La Marmotte', emoji: '🚴', sport: 'cyclisme', date: '4 juil. 2026', location: 'Alpe d\'Huez', category: 'cyclisme' },
  { name: 'Spartan Race', emoji: '🏋️', sport: 'crossfit', date: '9 mai 2026', location: 'Paris', category: 'crossfit' },
  { name: 'Marathon Berlin', emoji: '🏃', sport: 'running', date: '27 sept. 2026', location: 'Berlin', category: 'marathon' },
];

const CATEGORIES = [
  { key: 'all', label: 'Tous' },
  { key: 'marathon', label: '🏃 Marathons' },
  { key: 'trail', label: '⛰️ Trails' },
  { key: 'triathlon', label: '🏊 Triathlons' },
  { key: 'crossfit', label: '🏋️ CrossFit' },
  { key: 'cyclisme', label: '🚴 Cyclisme' },
];

// ── Skeletons ────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <Skeleton className="h-2 rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

// ── Program Card ─────────────────────────────────────────────────────────────
function ProgramCard({
  prog,
  isEnrolled,
  enrolling,
  onEnroll,
  selectedEvent,
}: {
  prog: Program;
  isEnrolled: boolean;
  enrolling: boolean;
  onEnroll: () => void;
  selectedEvent: string | null;
}) {
  const sportEmoji = SPORT_EMOJIS[prog.sport as Sport] || '⚡';
  const sportLabel = SPORT_LABELS[prog.sport as Sport] || prog.sport;
  const enrollCount = prog.program_enrollments?.[0]?.count ?? 0;
  const coachName = prog.coach_profiles?.display_name || 'Coach';

  const matchesEvent =
    selectedEvent &&
    (prog.title.toLowerCase().includes(selectedEvent.toLowerCase()) ||
      prog.description?.toLowerCase().includes(selectedEvent.toLowerCase()));

  // Sport accent color
  const accentColors: Record<string, string> = {
    running: '#3b82f6',
    trail: '#10b981',
    triathlon: '#0ea5e9',
    crossfit: '#ef4444',
    musculation: '#10b981',
    cyclisme: '#14b8a6',
    natation: '#0ea5e9',
    yoga: '#8b5cf6',
    boxe: '#f59e0b',
    fitness: '#f97316',
    pilates: '#a78bfa',
    meditation: '#6366f1',
  };
  const accent = accentColors[prog.sport] || '#6b7280';

  return (
    <Link
      href={`/explore/programs/${prog.id}`}
      className="group block rounded-2xl border border-gray-200 bg-white overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
    >
      {/* Accent bar */}
      <div className="h-1.5" style={{ background: accent }} />

      <div className="p-4">
        {/* Event badge */}
        {matchesEvent && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2.5 py-1 text-[11px] font-bold">
              🎯 {selectedEvent}
            </span>
          </div>
        )}

        {/* Header: emoji + title */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg shrink-0"
            style={{ background: `${accent}15` }}
          >
            {sportEmoji}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-gray-900 leading-tight line-clamp-2 group-hover:text-brand-600 transition-colors">
              {prog.title}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{sportLabel}</p>
          </div>
        </div>

        {/* Description */}
        {prog.description && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
            {prog.description}
          </p>
        )}

        {/* Coach + enrollments */}
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-gray-500">
              {coachName[0]?.toUpperCase()}
            </span>
          </div>
          <span className="text-xs text-gray-500 truncate">{coachName}</span>
          {enrollCount > 0 && (
            <span className="ml-auto text-[10px] text-gray-400 shrink-0">
              {enrollCount} inscrit{enrollCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="text-[11px] font-medium bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">
            {LEVEL_LABELS[prog.level] || prog.level}
          </span>
          <span className="text-[11px] font-medium bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">
            {prog.duration_weeks} sem.
          </span>
          <span
            className={`text-[11px] font-bold rounded-full px-2.5 py-0.5 ${
              prog.price === 0
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {prog.price === 0 ? 'Gratuit' : `${prog.price} €`}
          </span>
        </div>

        {/* CTA */}
        <div onClick={(e) => e.preventDefault()}>
          {isEnrolled ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 py-2.5 text-center text-sm font-semibold text-emerald-700">
              ✓ Inscrit
            </div>
          ) : (
            <button
              onClick={onEnroll}
              disabled={enrolling}
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
              style={{ background: accent }}
            >
              {enrolling
                ? 'Inscription...'
                : prog.price > 0
                  ? `Acheter ${prog.price} €`
                  : "S'inscrire"}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Event Search Bar ─────────────────────────────────────────────────────────
function EventSearchBar({
  onSelect,
  selectedEvent,
  onClear,
}: {
  onSelect: (event: EventResult) => void;
  selectedEvent: string | null;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EventResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/events/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setIsOpen(true);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (selectedEvent) {
    return (
      <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 border border-brand-200 bg-brand-50">
        <span className="text-sm">🎯</span>
        <span className="text-sm font-bold text-brand-700 flex-1">{selectedEvent}</span>
        <button
          onClick={onClear}
          className="text-xs font-medium text-gray-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-white transition"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Marathon de Paris, UTMB, Ironman..."
          className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:bg-white transition"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50 max-h-72 overflow-y-auto">
          {results.map((ev, i) => (
            <button
              key={`${ev.name}-${i}`}
              onClick={() => {
                onSelect(ev);
                setQuery('');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
            >
              <span className="text-lg shrink-0">
                {SPORT_EMOJIS[ev.sport as Sport] || '⚡'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{ev.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {ev.location}
                  {ev.distanceKm ? ` · ${ev.distanceKm} km` : ''}
                  {ev.date
                    ? ` · ${new Date(ev.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}`
                    : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ExploreProgramsPage() {
  const { userId } = useAuthStore();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());

  // Event filter
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedEventSport, setSelectedEventSport] = useState<string | null>(null);
  const [carouselCategory, setCarouselCategory] = useState('all');

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [sort, setSort] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const buildUrl = useCallback(
    (pageOffset: number) => {
      const p = new URLSearchParams();
      p.set('sort', sort);
      p.set('limit', String(PAGE_SIZE));
      p.set('offset', String(pageOffset));
      if (search) p.set('search', search);
      if (selectedEvent) p.set('event', selectedEvent);
      if (selectedEventSport) p.set('sport', selectedEventSport);
      if (selectedLevel !== 'all') p.set('level', selectedLevel);
      if (selectedDuration !== null) {
        const dur = DURATION_OPTIONS[selectedDuration];
        p.set('min_duration', String(dur.min));
        if (dur.max) p.set('max_duration', String(dur.max));
      }
      if (priceFilter === 'free') {
        p.set('min_price', '0');
        p.set('max_price', '0');
      }
      if (priceFilter === 'paid') p.set('min_price', '0.01');
      return `/api/programs?${p.toString()}`;
    },
    [search, selectedEvent, selectedEventSport, selectedLevel, selectedDuration, priceFilter, sort]
  );

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
      setPrograms((prev) => [...prev, ...list]);
      setOffset(newOffset);
      setHasMore(list.length === PAGE_SIZE);
    } catch {
      /* ignore */
    }
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
        setEnrolled((prev) => new Set(prev).add(programId));
      }
    } catch {
      /* ignore */
    }
    setEnrolling(null);
  };

  const handleSelectEvent = (ev: EventResult) => {
    setSelectedEvent(ev.name);
    setSelectedEventSport(ev.sport);
  };

  const handleSelectCarouselEvent = (ev: (typeof POPULAR_EVENTS)[0]) => {
    setSelectedEvent(ev.name);
    setSelectedEventSport(ev.sport);
  };

  const handleClearEvent = () => {
    setSelectedEvent(null);
    setSelectedEventSport(null);
  };

  const filteredCarousel =
    carouselCategory === 'all'
      ? POPULAR_EVENTS
      : POPULAR_EVENTS.filter((e) => e.category === carouselCategory);

  const hasFilters = search || selectedLevel !== 'all' || selectedDuration !== null || priceFilter !== 'all';

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setSelectedEvent(null);
    setSelectedEventSport(null);
    setSelectedLevel('all');
    setSelectedDuration(null);
    setPriceFilter('all');
    setSort('popular');
    setCarouselCategory('all');
  };

  return (
    <>
      <AppHeader title="Programmes" />

      {/* ── Hero + Search + Carousel — all white/light ──────────────────── */}
      <div className="px-4 pt-6 pb-4 border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          {/* Title + search */}
          <div className="max-w-xl mb-5">
            <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-1">
              Prepare ton prochain objectif
            </h1>
            <p className="text-sm text-gray-500 mb-4">
              Trouve le programme parfait pour ton evenement
            </p>
            <EventSearchBar
              onSelect={handleSelectEvent}
              selectedEvent={selectedEvent}
              onClear={handleClearEvent}
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCarouselCategory(cat.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition border ${
                  carouselCategory === cat.key
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Event cards — white bordered */}
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
            {filteredCarousel.map((ev) => {
              const isActive = selectedEvent === ev.name;
              return (
                <button
                  key={ev.name}
                  onClick={() =>
                    isActive ? handleClearEvent() : handleSelectCarouselEvent(ev)
                  }
                  className={`flex-shrink-0 rounded-xl px-4 py-3 min-w-[150px] text-left transition-all border ${
                    isActive
                      ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-200'
                      : 'bg-white border-gray-200 hover:border-brand-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{ev.emoji}</span>
                    <span className={`text-xs font-bold truncate ${isActive ? 'text-brand-700' : 'text-gray-900'}`}>
                      {ev.name}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 space-x-2">
                    <span>{ev.date}</span>
                    <span>· {ev.location}</span>
                  </div>
                  {isActive && (
                    <span className="inline-block mt-1.5 text-[10px] font-bold text-brand-600 bg-brand-100 rounded-full px-2 py-0.5">
                      ✓ Selectionne
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div className="p-4 md:p-6 pb-24 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-bold text-gray-900">
              {selectedEvent ? 'Programmes recommandes' : 'Tous les programmes'}
            </h2>
            {!loading && (
              <span className="text-[11px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                {programs.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
                hasFilters
                  ? 'border-brand-300 bg-brand-50 text-brand-600'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              Filtres
              {hasFilters && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilters();
                  }}
                  className="ml-1 text-[10px] text-brand-400 hover:text-red-500"
                >
                  ✕
                </button>
              )}
            </button>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 space-y-4">
            {/* Search */}
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher par nom..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />

            {/* Level */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Niveau</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(LEVEL_LABELS).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setSelectedLevel(val)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      selectedLevel === val
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Duree</label>
              <div className="flex flex-wrap gap-1.5">
                {DURATION_OPTIONS.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedDuration(selectedDuration === i ? null : i)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      selectedDuration === i
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Prix</label>
              <div className="flex gap-1.5">
                {(['all', 'free', 'paid'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setPriceFilter(v)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      priceFilter === v
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {v === 'all' ? 'Tous' : v === 'free' ? 'Gratuit' : 'Payant'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : programs.length === 0 ? (
          <EmptyState
            title="Aucun programme trouve"
            description={
              hasFilters || selectedEvent
                ? 'Essayez de modifier vos filtres'
                : 'Revenez bientot pour decouvrir de nouveaux programmes'
            }
            action={
              hasFilters || selectedEvent
                ? { label: 'Effacer les filtres', onClick: clearFilters }
                : undefined
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {programs.map((prog) => (
                <ProgramCard
                  key={prog.id}
                  prog={prog}
                  isEnrolled={enrolled.has(prog.id)}
                  enrolling={enrolling === prog.id}
                  onEnroll={() => handleEnroll(prog.id)}
                  selectedEvent={selectedEvent}
                />
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-6">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
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

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

// Popular events for the carousel
const POPULAR_CAROUSEL_EVENTS: Array<{
  name: string;
  emoji: string;
  sport: string;
  date: string;
  location: string;
  category: string;
}> = [
  { name: 'Marathon de Paris', emoji: '🏃', sport: 'running', date: '11 avril 2027', location: 'Paris', category: 'marathon' },
  { name: 'UTMB', emoji: '⛰️', sport: 'trail', date: '28 août 2026', location: 'Chamonix', category: 'trail' },
  { name: 'Ironman France Nice', emoji: '🏊🚴🏃', sport: 'triathlon', date: '28 juin 2026', location: 'Nice', category: 'triathlon' },
  { name: 'Semi-Marathon de Paris', emoji: '🏃', sport: 'running', date: '7 mars 2027', location: 'Paris', category: 'marathon' },
  { name: 'Trail des Templiers', emoji: '⛰️', sport: 'trail', date: '18 oct 2026', location: 'Millau', category: 'trail' },
  { name: 'French Throwdown', emoji: '🏋️', sport: 'crossfit', date: '30 mai 2026', location: 'Paris', category: 'crossfit' },
  { name: 'Marathon de Berlin', emoji: '🏃', sport: 'running', date: '27 sept 2026', location: 'Berlin', category: 'marathon' },
  { name: 'Diagonale des Fous', emoji: '⛰️', sport: 'trail', date: '22 oct 2026', location: 'La Réunion', category: 'trail' },
  { name: 'La Marmotte', emoji: '🚴', sport: 'cyclisme', date: '4 juil 2026', location: 'Alpe d\'Huez', category: 'cyclisme' },
  { name: 'Spartan Race Paris', emoji: '🏋️', sport: 'crossfit', date: '9 mai 2026', location: 'Paris', category: 'crossfit' },
];

const CATEGORY_FILTERS = [
  { key: 'all', label: 'Tous', emoji: '🔥' },
  { key: 'marathon', label: 'Marathons', emoji: '🏃' },
  { key: 'trail', label: 'Trails', emoji: '⛰️' },
  { key: 'triathlon', label: 'Triathlons', emoji: '🏊🚴🏃' },
  { key: 'crossfit', label: 'CrossFit', emoji: '🏋️' },
  { key: 'cyclisme', label: 'Cyclisme', emoji: '🚴' },
];

function ProgramCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-white">
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
  selectedEvent,
}: {
  prog: Program;
  isEnrolled: boolean;
  enrolling: boolean;
  onEnroll: () => void;
  pushingGarmin: boolean;
  garminConnected: boolean;
  onPushGarmin: () => void;
  selectedEvent: string | null;
}) {
  const sportEmoji = SPORT_EMOJIS[prog.sport as Sport] || '⚡';
  const sportLabel = SPORT_LABELS[prog.sport as Sport] || prog.sport;
  const gradient = SPORT_GRADIENTS[prog.sport as Sport] || SPORT_GRADIENTS['autre'];
  const enrollCount = prog.program_enrollments?.[0]?.count ?? 0;
  const coachName = prog.coach_profiles?.display_name || 'Coach';
  const coachAvatar = prog.coach_profiles?.avatar_url;

  // Check if program mentions the selected event
  const matchesEvent = selectedEvent && (
    prog.title.toLowerCase().includes(selectedEvent.toLowerCase()) ||
    prog.description?.toLowerCase().includes(selectedEvent.toLowerCase())
  );

  return (
    <Link href={`/explore/programs/${prog.id}`} className="group block rounded-2xl border border-border bg-white overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      {/* Cover */}
      <div
        className="relative h-36 flex items-end"
        style={{ background: prog.cover_image_url ? undefined : gradient }}
      >
        {prog.cover_image_url && (
          <img src={prog.cover_image_url} alt={prog.title} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Event badge */}
        {matchesEvent && (
          <div className="absolute top-2 left-2 z-20">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
              🎯 {selectedEvent}
            </span>
          </div>
        )}

        <div className="relative z-10 px-4 pb-3 flex items-end gap-3 w-full">
          <span className="text-2xl drop-shadow">{sportEmoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white drop-shadow truncate">{prog.title}</h3>
            <p className="text-xs text-white/80 truncate">{prog.duration_weeks} semaines</p>
          </div>
          <div className="text-right">
            {prog.price === 0 ? (
              <span className="text-xs font-bold text-emerald-300 bg-black/30 rounded-full px-2 py-0.5">Gratuit</span>
            ) : (
              <span className="text-xs font-bold text-white bg-black/30 rounded-full px-2 py-0.5">{prog.price}€</span>
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
    if (query.length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/events/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setIsOpen(true);
      } catch { setResults([]); }
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
      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 md:py-4 max-w-2xl mx-auto">
        <span className="text-lg">🎯</span>
        <span className="text-sm md:text-base font-semibold text-white flex-1">{selectedEvent}</span>
        <button
          onClick={onClear}
          className="text-white/60 hover:text-white text-sm font-medium px-2 py-1 rounded-lg hover:bg-white/10 transition"
        >
          Changer
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative max-w-2xl mx-auto">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Rechercher un événement... (Marathon de Paris, UTMB, Ironman...)"
          className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/50 rounded-2xl pl-12 pr-4 py-3.5 md:py-4 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/50 transition"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-border overflow-hidden z-50 max-h-80 overflow-y-auto">
          {results.map((ev, i) => {
            const sportEmoji = SPORT_EMOJIS[ev.sport as Sport] || '⚡';
            return (
              <button
                key={`${ev.name}-${i}`}
                onClick={() => {
                  onSelect(ev);
                  setQuery('');
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors text-left border-b border-border/50 last:border-0"
              >
                <span className="text-xl flex-shrink-0">{sportEmoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text truncate">{ev.name}</p>
                  <p className="text-xs text-muted truncate">
                    {ev.location}
                    {ev.distanceKm ? ` · ${ev.distanceKm} km` : ''}
                    {ev.date ? ` · ${new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
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

  // Event filter
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedEventSport, setSelectedEventSport] = useState<string | null>(null);
  const [carouselCategory, setCarouselCategory] = useState('all');

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedSports, setSelectedSports] = useState<Sport[]>([]);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [sort, setSort] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);

  const carouselRef = useRef<HTMLDivElement>(null);

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
    if (selectedEvent) p.set('event', selectedEvent);
    if (selectedEventSport && !selectedSports.length) p.set('sport', selectedEventSport);
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
  }, [search, selectedEvent, selectedEventSport, selectedSports, selectedLevel, selectedDuration, priceFilter, sort]);

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

  const handleSelectEvent = (ev: EventResult) => {
    setSelectedEvent(ev.name);
    setSelectedEventSport(ev.sport);
  };

  const handleSelectCarouselEvent = (ev: typeof POPULAR_CAROUSEL_EVENTS[0]) => {
    setSelectedEvent(ev.name);
    setSelectedEventSport(ev.sport);
  };

  const handleClearEvent = () => {
    setSelectedEvent(null);
    setSelectedEventSport(null);
  };

  const toggleSport = (sport: Sport) => {
    setSelectedSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    );
  };

  // Active filter count
  const activeFilters: string[] = [];
  if (search) activeFilters.push(`"${search}"`);
  if (selectedEvent) activeFilters.push(`🎯 ${selectedEvent}`);
  selectedSports.forEach(s => activeFilters.push(SPORT_LABELS[s]));
  if (selectedLevel !== 'all') activeFilters.push(LEVEL_LABELS[selectedLevel]);
  if (selectedDuration !== null) activeFilters.push(DURATION_OPTIONS[selectedDuration].label);
  if (priceFilter !== 'all') activeFilters.push(priceFilter === 'free' ? 'Gratuit' : 'Payant');

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setSelectedEvent(null);
    setSelectedEventSport(null);
    setSelectedSports([]);
    setSelectedLevel('all');
    setSelectedDuration(null);
    setPriceFilter('all');
    setSort('popular');
    setCarouselCategory('all');
  };

  const filteredCarouselEvents = carouselCategory === 'all'
    ? POPULAR_CAROUSEL_EVENTS
    : POPULAR_CAROUSEL_EVENTS.filter(e => e.category === carouselCategory);

  return (
    <>
      <AppHeader title="Programmes" />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-950 via-gray-900 to-gray-800 px-4 pt-8 pb-10 md:pt-12 md:pb-14">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl md:text-4xl font-extrabold text-white mb-2 tracking-tight">
            Prépare ton prochain objectif
          </h1>
          <p className="text-sm md:text-base text-white/60 mb-6 md:mb-8 max-w-lg mx-auto">
            Trouve le programme d&apos;entraînement parfait pour ton événement
          </p>

          <EventSearchBar
            onSelect={handleSelectEvent}
            selectedEvent={selectedEvent}
            onClear={handleClearEvent}
          />
        </div>
      </div>

      {/* Popular Events Carousel */}
      <div className="bg-gray-800 border-t border-white/5 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Category tabs */}
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORY_FILTERS.map(cat => (
              <button
                key={cat.key}
                onClick={() => setCarouselCategory(cat.key)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  carouselCategory === cat.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Carousel */}
          <div
            ref={carouselRef}
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
          >
            {filteredCarouselEvents.map((ev) => {
              const isActive = selectedEvent === ev.name;
              const sportGrad = SPORT_GRADIENTS[ev.sport as Sport] || SPORT_GRADIENTS['autre'];
              return (
                <button
                  key={ev.name}
                  onClick={() => isActive ? handleClearEvent() : handleSelectCarouselEvent(ev)}
                  className={`flex-shrink-0 snap-start rounded-2xl p-4 min-w-[180px] md:min-w-[200px] text-left transition-all duration-200 border ${
                    isActive
                      ? 'border-brand-400 ring-2 ring-brand-400/30 shadow-lg shadow-brand-500/20'
                      : 'border-white/10 hover:border-white/30 hover:shadow-md'
                  }`}
                  style={{ background: sportGrad }}
                >
                  <span className="text-2xl block mb-2">{ev.emoji}</span>
                  <p className="text-sm font-bold text-white leading-tight mb-1 line-clamp-2">{ev.name}</p>
                  <p className="text-[11px] text-white/70">{ev.date}</p>
                  <p className="text-[11px] text-white/60">{ev.location}</p>
                  {isActive && (
                    <span className="inline-block mt-2 text-[10px] font-bold text-white bg-white/20 rounded-full px-2 py-0.5">
                      ✓ Sélectionné
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="p-4 md:p-8 pb-24 max-w-7xl mx-auto bg-surface min-h-screen">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg md:text-xl font-extrabold text-text">
              {selectedEvent ? 'Programmes recommandés' : 'Tous les programmes'}
            </h2>
            {!loading && (
              <span className="text-xs text-muted bg-white rounded-full px-2 py-0.5 border border-border">
                {programs.length} résultat{programs.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium border transition-colors ${
                showFilters || activeFilters.length > 0
                  ? 'bg-brand-50 text-brand-700 border-brand-200'
                  : 'bg-white text-muted border-border hover:border-brand-300'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtres
              {activeFilters.length > 0 && (
                <span className="bg-brand-500 text-white rounded-full w-4 h-4 text-[10px] font-bold flex items-center justify-center">
                  {activeFilters.length}
                </span>
              )}
            </button>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Collapsible filters */}
        {showFilters && (
          <div className="mb-4 p-4 rounded-2xl border border-border bg-white space-y-3 animate-in slide-in-from-top-2 duration-200">
            {/* Search */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
              <input
                type="text"
                placeholder="Rechercher un programme..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface pl-9 pr-4 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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

            {/* Sport chips */}
            <div>
              <p className="text-xs font-semibold text-muted mb-1.5">Sport</p>
              <div className="flex flex-wrap gap-1.5">
                {SPORTS.map(sport => (
                  <button
                    key={sport}
                    onClick={() => toggleSport(sport)}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                      selectedSports.includes(sport)
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-surface text-muted border-border hover:border-brand-400 hover:text-text'
                    }`}
                  >
                    <span>{SPORT_EMOJIS[sport]}</span>
                    {SPORT_LABELS[sport]}
                  </button>
                ))}
              </div>
            </div>

            {/* Level + Duration + Price in a row */}
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs font-semibold text-muted mb-1.5">Niveau</p>
                <div className="flex flex-wrap gap-1.5">
                  {['all', 'beginner', 'intermediate', 'advanced'].map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setSelectedLevel(lvl)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                        selectedLevel === lvl
                          ? 'bg-violet-500 text-white border-violet-500'
                          : 'bg-surface text-muted border-border hover:border-violet-400'
                      }`}
                    >
                      {LEVEL_LABELS[lvl]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted mb-1.5">Durée</p>
                <div className="flex flex-wrap gap-1.5">
                  {DURATION_OPTIONS.map((dur, idx) => (
                    <button
                      key={dur.label}
                      onClick={() => setSelectedDuration(selectedDuration === idx ? null : idx)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                        selectedDuration === idx
                          ? 'bg-cyan-500 text-white border-cyan-500'
                          : 'bg-surface text-muted border-border hover:border-cyan-400'
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted mb-1.5">Prix</p>
                <div className="flex flex-wrap gap-1.5">
                  {(['all', 'free', 'paid'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPriceFilter(p)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                        priceFilter === p
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-surface text-muted border-border hover:border-emerald-400'
                      }`}
                    >
                      {p === 'all' ? 'Tout prix' : p === 'free' ? 'Gratuit' : 'Payant'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active filters */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs text-muted">Filtres :</span>
            {activeFilters.map(f => (
              <span key={f} className="flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 text-xs px-2.5 py-0.5 font-medium border border-brand-100">
                {f}
              </span>
            ))}
            <button onClick={clearFilters} className="text-xs text-muted hover:text-text underline ml-1">
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
            title={selectedEvent ? `Aucun programme pour "${selectedEvent}"` : "Aucun programme trouvé"}
            description={selectedEvent
              ? "Aucun programme ne cible cet événement pour l'instant. Essayez un autre événement ou explorez tous les programmes."
              : "Essayez de modifier vos filtres ou revenez plus tard."
            }
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
                  selectedEvent={selectedEvent}
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

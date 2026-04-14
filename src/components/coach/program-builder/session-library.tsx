'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { DraggableSessionCard, type DraggableItem } from './draggable-session-card';
import { isMultiSport } from '@/lib/sports';
import type { Discipline } from '@/lib/training/types';

// ─── Types ──────────────────────────────────────────────────────────────────
interface SessionLibraryProps {
  sessions: { id: string; title: string; sport: string; duration: number; type: string }[];
  routines: { id: string; title: string; type: string; duration: number }[];
  onToggle?: () => void;
  onCreateSession?: () => void;
  onCreateRoutine?: () => void;
  sport?: string;
}

// Discipline tabs for triathlon/duathlon
const DISC_TABS: { id: Discipline | 'all'; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'swim', label: '🏊 Natation' },
  { id: 'bike', label: '🚴 Vélo' },
  { id: 'run', label: '🏃 Course' },
  { id: 'other', label: '🔄 Transitions' },
];

// Map session sport to discipline for filtering
function sportToDiscipline(sport: string): Discipline | null {
  if (sport === 'natation') return 'swim';
  if (sport === 'cyclisme') return 'bike';
  if (sport === 'running' || sport === 'trail') return 'run';
  if (sport === 'triathlon' || sport === 'transition') return 'other';
  return null;
}

// ─── Component ──────────────────────────────────────────────────────────────
export function SessionLibrary({
  sessions,
  routines,
  onToggle,
  onCreateSession,
  onCreateRoutine,
  sport,
}: SessionLibraryProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [activeDisc, setActiveDisc] = useState<Discipline | 'all'>('all');

  const query = search.toLowerCase().trim();
  const multiSport = sport ? isMultiSport(sport) : false;

  const filteredSessions = sessions.filter((s) => {
    if (!s.title.toLowerCase().includes(query)) return false;
    if (multiSport && activeDisc !== 'all') {
      const disc = sportToDiscipline(s.sport);
      if (disc !== activeDisc) return false;
    }
    return true;
  });

  const filteredRoutines = routines.filter((r) =>
    r.title.toLowerCase().includes(query),
  );

  const handleCollapse = () => {
    setCollapsed(true);
    onToggle?.();
  };

  // Collapsed state — thin vertical bar
  if (collapsed) {
    return (
      <div className="w-10 border-r border-gray-200 bg-gray-50 flex flex-col items-center pt-4 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition"
          aria-label="Ouvrir la bibliothèque"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 border-r border-gray-200 bg-gray-50 overflow-y-auto flex flex-col shrink-0">
      {/* Header */}
      <div className="sticky top-0 bg-gray-50 z-10 px-4 pt-4 pb-2 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800">Bibliothèque</h3>
          <button
            onClick={handleCollapse}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition"
            aria-label="Réduire la bibliothèque"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-xs"
        />

        {/* Discipline tabs — only for multi-sport */}
        {multiSport && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {DISC_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDisc(tab.id)}
                className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                  activeDisc === tab.id
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sessions section */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Mes séances
          </span>
          <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-gray-200 px-1.5 text-[10px] font-semibold text-gray-600">
            {filteredSessions.length}
          </span>
        </div>

        <div className="space-y-1.5">
          {filteredSessions.map((s) => {
            const item: DraggableItem = {
              id: `session-${s.id}`,
              title: s.title,
              sport: s.sport,
              duration: s.duration,
              kind: 'session',
              type: s.type,
            };
            return <DraggableSessionCard key={s.id} item={item} />;
          })}
          {filteredSessions.length === 0 && (
            <p className="text-xs text-gray-400 py-2 text-center">
              {multiSport && activeDisc !== 'all'
                ? 'Aucune séance pour cette discipline'
                : 'Aucune séance'}
            </p>
          )}
        </div>

        {onCreateSession && (
          <button
            onClick={onCreateSession}
            className="mt-2 w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 hover:border-brand-400 hover:text-brand-600 transition"
          >
            + Nouvelle séance
          </button>
        )}
      </div>

      {/* Routines section */}
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Mes routines
          </span>
          <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-gray-200 px-1.5 text-[10px] font-semibold text-gray-600">
            {filteredRoutines.length}
          </span>
        </div>

        <div className="space-y-1.5">
          {filteredRoutines.map((r) => {
            const item: DraggableItem = {
              id: `routine-${r.id}`,
              title: r.title,
              sport: 'fitness',
              duration: r.duration,
              kind: 'routine',
              type: r.type,
            };
            return <DraggableSessionCard key={r.id} item={item} />;
          })}
        </div>

        {onCreateRoutine && (
          <button
            onClick={onCreateRoutine}
            className="mt-2 w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 hover:border-brand-400 hover:text-brand-600 transition"
          >
            + Nouvelle routine
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { DraggableSessionCard, type DraggableItem } from './draggable-session-card';

// ─── Types ──────────────────────────────────────────────────────────────────
interface SessionLibraryProps {
  sessions: { id: string; title: string; sport: string; duration: number; type: string }[];
  routines: { id: string; title: string; type: string; duration_minutes: number }[];
  onCreateSession: () => void;
  onCreateRoutine: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────
export function SessionLibrary({
  sessions,
  routines,
  onCreateSession,
  onCreateRoutine,
}: SessionLibraryProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');

  const query = search.toLowerCase().trim();

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(query),
  );

  const filteredRoutines = routines.filter((r) =>
    r.title.toLowerCase().includes(query),
  );

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
            onClick={() => setCollapsed(true)}
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
        </div>

        <button
          onClick={onCreateSession}
          className="mt-2 w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 hover:border-brand-400 hover:text-brand-600 transition"
        >
          + Nouvelle séance
        </button>
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
              duration: r.duration_minutes,
              kind: 'routine',
              type: r.type,
            };
            return <DraggableSessionCard key={r.id} item={item} />;
          })}
        </div>

        <button
          onClick={onCreateRoutine}
          className="mt-2 w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 hover:border-brand-400 hover:text-brand-600 transition"
        >
          + Nouvelle routine
        </button>
      </div>
    </div>
  );
}

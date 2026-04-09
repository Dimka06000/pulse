'use client';

import { useEventsStore } from '@/stores/events';

const SPORTS = [
  'Boxe', 'Yoga', 'Running', 'Musculation', 'Natation',
  'Football', 'Tennis', 'CrossFit', 'Danse', 'Pilates',
];

const LEVELS = [
  { value: '', label: 'Tous niveaux' },
  { value: 'beginner', label: 'Debutant' },
  { value: 'intermediate', label: 'Intermediaire' },
  { value: 'advanced', label: 'Avance' },
];

export function EventFilters() {
  const { filters, setFilters, resetFilters } = useEventsStore();

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Sport */}
      <select
        value={filters.sport ?? ''}
        onChange={(e) => setFilters({ sport: e.target.value || undefined })}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">Tous les sports</option>
        {SPORTS.map((s) => (
          <option key={s} value={s.toLowerCase()}>{s}</option>
        ))}
      </select>

      {/* Level */}
      <select
        value={filters.level ?? ''}
        onChange={(e) => setFilters({ level: e.target.value || undefined })}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        {LEVELS.map((l) => (
          <option key={l.value} value={l.value}>{l.label}</option>
        ))}
      </select>

      {/* City */}
      <input
        type="text"
        placeholder="Ville..."
        value={filters.city ?? ''}
        onChange={(e) => setFilters({ city: e.target.value || undefined })}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-40"
      />

      {/* Date */}
      <input
        type="date"
        value={filters.dateFrom ?? ''}
        onChange={(e) => setFilters({ dateFrom: e.target.value || undefined })}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />

      {/* Type */}
      <select
        value={filters.type ?? ''}
        onChange={(e) => setFilters({ type: (e.target.value as any) || undefined })}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">Tous types</option>
        <option value="platform">Officiels</option>
        <option value="partner">Partenaires</option>
      </select>

      {/* Reset */}
      <button
        onClick={resetFilters}
        className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100"
      >
        Reinitialiser
      </button>
    </div>
  );
}

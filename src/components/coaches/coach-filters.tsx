'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export interface SearchFilters {
  sport: string;
  priceRange: [number, number];
  minRating: number;
  lat?: number;
  lng?: number;
  radiusKm: number;
  sortBy: string;
}

interface CoachFiltersProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  onSearch: () => void;
}

export function CoachFilters({ filters, onChange, onSearch }: CoachFiltersProps) {
  const [specialties, setSpecialties] = useState<string[]>([]);

  useEffect(() => {
    api
      .get<{ specialties: string[] }>('/api/coaches/specialties')
      .then((res) => setSpecialties(res.specialties))
      .catch(() => {});
  }, []);

  const sportOptions = [
    { value: '', label: 'Tous les sports' },
    ...specialties.map((s) => ({ value: s, label: s })),
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Pertinence' },
    { value: 'distance', label: 'Distance' },
    { value: 'price_asc', label: 'Prix croissant' },
    { value: 'price_desc', label: 'Prix décroissant' },
    { value: 'rating', label: 'Meilleure note' },
  ];

  const ratingOptions = [
    { value: '0', label: 'Toutes les notes' },
    { value: '3', label: '3+ étoiles' },
    { value: '4', label: '4+ étoiles' },
    { value: '4.5', label: '4.5+ étoiles' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Select
        label="Sport"
        options={sportOptions}
        value={filters.sport}
        onChange={(e) => onChange({ ...filters, sport: e.target.value })}
      />

      <Slider
        label="Tarif horaire"
        min={0}
        max={200}
        step={5}
        value={filters.priceRange}
        onChange={(priceRange) => onChange({ ...filters, priceRange })}
        formatValue={(v) => `${v}€`}
      />

      <Select
        label="Note minimum"
        options={ratingOptions}
        value={String(filters.minRating)}
        onChange={(e) => onChange({ ...filters, minRating: Number(e.target.value) })}
      />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Localisation</label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Latitude"
            type="number"
            step="any"
            value={filters.lat ?? ''}
            onChange={(e) =>
              onChange({ ...filters, lat: e.target.value ? Number(e.target.value) : undefined })
            }
          />
          <Input
            placeholder="Longitude"
            type="number"
            step="any"
            value={filters.lng ?? ''}
            onChange={(e) =>
              onChange({ ...filters, lng: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
        <Input
          label="Rayon (km)"
          type="number"
          min={1}
          max={200}
          value={filters.radiusKm}
          onChange={(e) => onChange({ ...filters, radiusKm: Number(e.target.value) })}
        />
      </div>

      <Select
        label="Trier par"
        options={sortOptions}
        value={filters.sortBy}
        onChange={(e) => onChange({ ...filters, sortBy: e.target.value })}
      />

      <Button onClick={onSearch} className="w-full">
        Rechercher
      </Button>
    </div>
  );
}

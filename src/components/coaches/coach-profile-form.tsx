'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SpecialtyTags } from '@/components/coaches/specialty-tags';
import { api } from '@/lib/api';

interface CoachProfileData {
  id: string;
  bio: string;
  specialties: string[];
  certifications: unknown[];
  hourly_rate: number;
  lat: number | null;
  lng: number | null;
  radius: number;
  accepts_anonymous_reviews: boolean;
}

export function CoachProfileForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('10');
  const [acceptsAnonymous, setAcceptsAnonymous] = useState(true);
  const [allSpecialties, setAllSpecialties] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<CoachProfileData>('/api/coaches/me').catch(() => null),
      api.get<{ specialties: string[] }>('/api/coaches/specialties').catch(() => ({ specialties: [] })),
    ]).then(([profile, specRes]) => {
      if (profile) {
        setBio(profile.bio ?? '');
        setSpecialties(profile.specialties ?? []);
        setHourlyRate(profile.hourly_rate ? String(profile.hourly_rate) : '');
        setLat(profile.lat != null ? String(profile.lat) : '');
        setLng(profile.lng != null ? String(profile.lng) : '');
        setRadius(String(profile.radius ?? 10));
        setAcceptsAnonymous(profile.accepts_anonymous_reviews ?? true);
      }
      setAllSpecialties(specRes.specialties);
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await api.patch('/api/coaches/me', {
        bio,
        specialties,
        hourlyRate: hourlyRate ? Number(hourlyRate) : 0,
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        radius: radius ? Number(radius) : 10,
        acceptsAnonymousReviews: acceptsAnonymous,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <div className="h-8 w-48 animate-pulse rounded-2xl bg-surface" />
        <div className="h-12 w-full animate-pulse rounded-2xl bg-surface" />
        <div className="h-12 w-full animate-pulse rounded-2xl bg-surface" />
        <div className="h-24 w-full animate-pulse rounded-2xl bg-surface" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 px-4 pb-24 md:px-0 md:pb-6">
      <h1 className="text-xl font-extrabold text-text md:text-2xl">Mon profil coach</h1>

      <Textarea
        label="Bio"
        placeholder="Présentez-vous en quelques lignes. Votre parcours, votre approche, ce qui vous motive..."
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={4}
      />

      <div>
        <label className="text-sm font-medium text-text">Spécialités</label>
        <div className="mt-1.5">
          <SpecialtyTags
            selected={specialties}
            onChange={setSpecialties}
            suggestions={allSpecialties}
          />
        </div>
      </div>

      <Input
        label="Tarif horaire (€)"
        type="number"
        min={0}
        step={5}
        placeholder="50"
        value={hourlyRate}
        onChange={(e) => setHourlyRate(e.target.value)}
      />

      <div>
        <label className="text-sm font-medium text-text">Localisation</label>
        <p className="text-xs text-muted mb-2">
          Entrez vos coordonnées pour apparaître dans les recherches géographiques.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Latitude"
            type="number"
            step="any"
            placeholder="48.8566"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
          <Input
            label="Longitude"
            type="number"
            step="any"
            placeholder="2.3522"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
          />
        </div>
      </div>

      <Input
        label="Rayon de déplacement (km)"
        type="number"
        min={1}
        max={200}
        value={radius}
        onChange={(e) => setRadius(e.target.value)}
      />

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="anonymous-reviews"
          checked={acceptsAnonymous}
          onChange={(e) => setAcceptsAnonymous(e.target.checked)}
          className="h-5 w-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        <label htmlFor="anonymous-reviews" className="text-sm text-text">
          Accepter les avis anonymes
        </label>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="rounded-xl bg-green-50 p-4 text-sm text-green-600">
          Profil mis à jour avec succès !
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
        <Button
          type="button"
          onClick={() => router.push('/coach')}
          className="w-full bg-surface text-muted hover:bg-surface/80 sm:w-auto"
        >
          Retour
        </Button>
      </div>
    </form>
  );
}

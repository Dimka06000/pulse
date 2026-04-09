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
    return <div className="animate-pulse text-gray-400">Chargement...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Mon profil coach</h1>

      <Textarea
        label="Bio"
        placeholder="Presentez-vous en quelques lignes. Votre parcours, votre approche, ce qui vous motive..."
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={4}
      />

      <div>
        <label className="text-sm font-medium text-gray-700">Specialites</label>
        <div className="mt-1.5">
          <SpecialtyTags
            selected={specialties}
            onChange={setSpecialties}
            suggestions={allSpecialties}
          />
        </div>
      </div>

      <Input
        label="Tarif horaire (euros)"
        type="number"
        min={0}
        step={5}
        placeholder="50"
        value={hourlyRate}
        onChange={(e) => setHourlyRate(e.target.value)}
      />

      <div>
        <label className="text-sm font-medium text-gray-700">Localisation</label>
        <p className="text-xs text-gray-500 mb-2">
          Entrez vos coordonnees pour apparaitre dans les recherches geographiques.
        </p>
        <div className="grid grid-cols-2 gap-3">
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
        label="Rayon de deplacement (km)"
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
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
        />
        <label htmlFor="anonymous-reviews" className="text-sm text-gray-700">
          Accepter les avis anonymes
        </label>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">
          Profil mis a jour avec succes !
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
        <Button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Retour au dashboard
        </Button>
      </div>
    </form>
  );
}

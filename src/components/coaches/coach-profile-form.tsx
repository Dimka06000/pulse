'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SpecialtyTags } from '@/components/coaches/specialty-tags';
import { AddressAutocomplete } from '@/components/pulse/address-autocomplete';
import { api } from '@/lib/api';
import {
  SPORTS,
  SPORT_LABELS,
  SPORT_EMOJIS,
  SPORT_GRADIENT_CLASSES,
  type Sport,
} from '@/lib/sports';

// ─── Types ──────────────────────────────────────────────────────────────────

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
  display_name: string;
  years_experience: number;
  main_sports: string[];
  instagram: string;
  website: string;
  avg_rating: number;
  total_sessions: number;
  user_profile?: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    city: string | null;
  };
}

interface UserProfile {
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  city: string | null;
}

interface FormData {
  displayName: string;
  bio: string;
  yearsExperience: number;
  mainSports: string[];
  specialties: string[];
  address: string;
  lat: string;
  lng: string;
  radius: string;
  hourlyRate: string;
  acceptsAnonymous: boolean;
  instagram: string;
  website: string;
}

const STEP_LABELS = ['Identité', 'Spécialités', 'Localisation', 'Aperçu'];
const STEP_SUBTITLES = ['Identité', 'Disciplines & Spécialités', 'Localisation & Tarifs', 'Liens & Aperçu'];
const TOTAL_STEPS = 4;

const DEFAULT_FORM: FormData = {
  displayName: '',
  bio: '',
  yearsExperience: 0,
  mainSports: [],
  specialties: [],
  address: '',
  lat: '',
  lng: '',
  radius: '10',
  hourlyRate: '',
  acceptsAnonymous: true,
  instagram: '',
  website: '',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function CoachProfileForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [allSpecialties, setAllSpecialties] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileMeta, setProfileMeta] = useState({ avgRating: 0, totalSessions: 0 });

  useEffect(() => {
    Promise.all([
      api.get<CoachProfileData>('/api/coaches/me').catch(() => null),
      api.get<{ specialties: string[] }>('/api/coaches/specialties').catch(() => ({ specialties: [] })),
    ]).then(([profile, specRes]) => {
      if (profile) {
        setForm({
          displayName: profile.display_name ?? '',
          bio: profile.bio ?? '',
          yearsExperience: profile.years_experience ?? 0,
          mainSports: profile.main_sports ?? [],
          specialties: profile.specialties ?? [],
          address: '',
          lat: profile.lat != null ? String(profile.lat) : '',
          lng: profile.lng != null ? String(profile.lng) : '',
          radius: String(profile.radius ?? 10),
          hourlyRate: profile.hourly_rate ? String(profile.hourly_rate) : '',
          acceptsAnonymous: profile.accepts_anonymous_reviews ?? true,
          instagram: profile.instagram ?? '',
          website: profile.website ?? '',
        });
        setProfileMeta({
          avgRating: profile.avg_rating ?? 0,
          totalSessions: profile.total_sessions ?? 0,
        });
        if (profile.user_profile) {
          setUserProfile(profile.user_profile);
        }
      }
      setAllSpecialties(specRes.specialties);
      setLoading(false);
    });
  }, []);

  function updateForm(updates: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  function canGoNext(): boolean {
    if (step === 0) return !!form.displayName.trim();
    if (step === 1) return form.mainSports.length > 0;
    return true;
  }

  function handleNext() {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  function toggleSport(sport: string) {
    setForm((prev) => {
      const current = prev.mainSports;
      if (current.includes(sport)) {
        return { ...prev, mainSports: current.filter((s) => s !== sport) };
      }
      if (current.length >= 5) return prev;
      return { ...prev, mainSports: [...current, sport] };
    });
  }

  async function handleSubmit() {
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await api.patch('/api/coaches/me', {
        bio: form.bio,
        specialties: form.specialties,
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : 0,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
        radius: form.radius ? Number(form.radius) : 10,
        acceptsAnonymousReviews: form.acceptsAnonymous,
        displayName: form.displayName,
        yearsExperience: form.yearsExperience,
        mainSports: form.mainSports,
        instagram: form.instagram,
        website: form.website,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        router.push('/coach');
      }, 1500);
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  // Initials for avatar placeholder
  const initials = form.displayName
    ? form.displayName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (userProfile?.first_name?.[0] ?? '').toUpperCase() +
      (userProfile?.last_name?.[0] ?? '').toUpperCase();

  const avatarUrl = userProfile?.avatar_url;

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
    <div className="mx-auto max-w-2xl px-4 pb-24 md:px-0 md:pb-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-text md:text-2xl">Mon profil coach</h1>
        <p className="mt-1 text-sm text-muted">
          {step + 1} / {TOTAL_STEPS} &mdash; {STEP_SUBTITLES[step]}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8 flex gap-2">
        {STEP_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => i < step && setStep(i)}
            disabled={i > step}
            className="flex-1 text-center"
          >
            <div
              className={`h-1.5 rounded-full mb-1.5 transition-colors ${
                i <= step ? 'bg-brand-500' : 'bg-gray-200'
              }`}
            />
            <span
              className={`text-[10px] sm:text-xs font-medium transition-colors ${
                i === step
                  ? 'text-brand-600'
                  : i < step
                    ? 'text-gray-500'
                    : 'text-gray-300'
              }`}
            >
              <span className="sm:hidden">{i + 1}. </span>{label}
            </span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-600">
          Profil mis à jour avec succès !
        </div>
      )}

      {/* ─── Step 0: Identité ─────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-6">
          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-200"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-xl font-bold ring-2 ring-brand-200">
                {initials || '?'}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-text">Photo de profil</p>
              <p className="text-xs text-muted">Modifiable depuis les paramètres du compte</p>
            </div>
          </div>

          <div>
            <Input
              label="Nom d'affichage"
              placeholder="Ex: Coach Sarah, Jean Dupont Coaching..."
              value={form.displayName}
              onChange={(e) => updateForm({ displayName: e.target.value })}
            />
            {!form.displayName.trim() && (
              <p className="mt-1 text-xs text-red-500">Nom d&apos;affichage requis</p>
            )}
          </div>

          <Textarea
            label="Bio"
            placeholder="Présentez-vous en quelques lignes. Votre parcours, votre approche, ce qui vous motive..."
            value={form.bio}
            onChange={(e) => updateForm({ bio: e.target.value })}
            rows={4}
          />

          <Input
            label="Années d'expérience"
            type="number"
            min={0}
            max={50}
            placeholder="5"
            value={form.yearsExperience || ''}
            onChange={(e) => updateForm({ yearsExperience: Number(e.target.value) || 0 })}
          />
        </div>
      )}

      {/* ─── Step 1: Disciplines & Spécialités ────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Main sports grid */}
          <div>
            <label className="text-sm font-medium text-text mb-2 block">
              Disciplines principales
              <span className="ml-1 text-xs text-muted font-normal">
                ({form.mainSports.length}/5)
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {SPORTS.map((s) => {
                const selected = form.mainSports.includes(s);
                const disabled = !selected && form.mainSports.length >= 5;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSport(s)}
                    disabled={disabled}
                    className={`flex flex-col items-center gap-1 rounded-xl p-3 text-center transition-all ${
                      selected
                        ? 'bg-brand-50 ring-2 ring-brand-500 shadow-sm'
                        : disabled
                          ? 'bg-gray-50 opacity-40 cursor-not-allowed'
                          : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-2xl">{SPORT_EMOJIS[s]}</span>
                    <span className="text-[11px] font-medium text-gray-700 leading-tight">
                      {SPORT_LABELS[s]}
                    </span>
                  </button>
                );
              })}
            </div>
            {form.mainSports.length === 0 && (
              <p className="mt-1 text-xs text-red-500">Choisissez au moins un sport</p>
            )}
          </div>

          {/* Specialties */}
          <div>
            <label className="text-sm font-medium text-text mb-1.5 block">Spécialités</label>
            <SpecialtyTags
              selected={form.specialties}
              onChange={(tags) => updateForm({ specialties: tags })}
              suggestions={allSpecialties}
            />
          </div>
        </div>
      )}

      {/* ─── Step 2: Localisation & Tarifs ─────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          <AddressAutocomplete
            label="Adresse / Zone d'intervention"
            value={form.address}
            placeholder="Rechercher votre adresse..."
            onSelect={(result) => {
              updateForm({
                address: result.address,
                lat: String(result.lat),
                lng: String(result.lng),
              });
            }}
          />

          <Input
            label="Rayon de déplacement (km)"
            type="number"
            min={1}
            max={200}
            value={form.radius}
            onChange={(e) => updateForm({ radius: e.target.value })}
          />

          <Input
            label="Tarif horaire (EUR)"
            type="number"
            min={0}
            step={5}
            placeholder="50"
            value={form.hourlyRate}
            onChange={(e) => updateForm({ hourlyRate: e.target.value })}
          />

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="anonymous-reviews"
              checked={form.acceptsAnonymous}
              onChange={(e) => updateForm({ acceptsAnonymous: e.target.checked })}
              className="h-5 w-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="anonymous-reviews" className="text-sm text-text">
              Accepter les avis anonymes
            </label>
          </div>
        </div>
      )}

      {/* ─── Step 3: Liens & Preview ───────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Social links */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text mb-1.5 block">Instagram</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted z-10">@</span>
                <Input
                  type="text"
                  value={form.instagram}
                  onChange={(e) => updateForm({ instagram: e.target.value.replace(/^@/, '') })}
                  placeholder="votre_handle"
                  className="pl-8"
                />
              </div>
            </div>

            <Input
              label="Site web"
              type="url"
              placeholder="https://www.monsite.com"
              value={form.website}
              onChange={(e) => updateForm({ website: e.target.value })}
            />
          </div>

          {/* Preview card */}
          <div>
            <p className="text-sm font-medium text-text mb-3">
              Aperçu de votre profil
            </p>
            <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Header with gradient */}
              <div className={`bg-gradient-to-r ${
                form.mainSports.length > 0
                  ? SPORT_GRADIENT_CLASSES[form.mainSports[0] as Sport] || 'from-brand-500 to-brand-600'
                  : 'from-brand-500 to-brand-600'
              } px-5 py-5`}>
                <div className="flex items-center gap-4">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="h-16 w-16 rounded-full object-cover ring-2 ring-white/30"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white text-lg font-bold ring-2 ring-white/30">
                      {initials || '?'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-white truncate">
                      {form.displayName || 'Sans nom'}
                    </h3>
                    {form.yearsExperience > 0 && (
                      <p className="text-sm text-white/80">
                        {form.yearsExperience} an{form.yearsExperience > 1 ? 's' : ''} d&apos;expérience
                      </p>
                    )}
                    {/* Stars */}
                    {profileMeta.avgRating > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`text-sm ${
                                star <= Math.round(profileMeta.avgRating)
                                  ? 'text-yellow-300'
                                  : 'text-white/30'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-white/70 ml-1">
                          ({profileMeta.totalSessions} séances)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Bio */}
                {form.bio && (
                  <p className="text-sm text-gray-600 line-clamp-3">{form.bio}</p>
                )}

                {/* Sport badges */}
                {form.mainSports.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.mainSports.map((s) => (
                      <span
                        key={s}
                        className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${
                          SPORT_GRADIENT_CLASSES[s as Sport] || 'from-gray-400 to-gray-500'
                        } px-3 py-1 text-xs font-medium text-white`}
                      >
                        {SPORT_EMOJIS[s as Sport]} {SPORT_LABELS[s as Sport]}
                      </span>
                    ))}
                  </div>
                )}

                {/* Specialty tags */}
                {form.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.specialties.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Location + rate */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  {(form.lat || userProfile?.city) && (
                    <span className="inline-flex items-center gap-1">
                      📍 {userProfile?.city || 'Position définie'} ({form.radius} km)
                    </span>
                  )}
                  {form.hourlyRate && (
                    <span className="inline-flex items-center gap-1 font-semibold text-brand-600">
                      {form.hourlyRate} EUR/h
                    </span>
                  )}
                </div>

                {/* Social links */}
                {(form.instagram || form.website) && (
                  <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                    {form.instagram && (
                      <span className="text-sm text-gray-500">
                        📸 @{form.instagram}
                      </span>
                    )}
                    {form.website && (
                      <span className="text-sm text-brand-500 truncate">
                        🔗 {form.website.replace(/^https?:\/\//, '')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Footer actions ────────────────────────────────────────── */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4 -mx-4 mt-6 flex gap-3">
        {step > 0 ? (
          <Button variant="secondary" onClick={handleBack} className="flex-1 sm:flex-none">
            Retour
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={() => router.push('/coach')}
            className="flex-1 sm:flex-none"
          >
            Annuler
          </Button>
        )}

        <div className="flex-1" />

        {step < TOTAL_STEPS - 1 ? (
          <Button onClick={handleNext} disabled={!canGoNext()} className="flex-1 sm:flex-none">
            Suivant
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={saving} className="flex-1 sm:flex-none">
            {saving ? 'Sauvegarde...' : 'Sauvegarder le profil'}
          </Button>
        )}
      </div>
    </div>
  );
}

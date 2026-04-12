'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ClubEvent {
  id: string;
  title: string;
  event_type: string;
  sport: string | null;
  level: string;
  location: string | null;
  starts_at: string;
  max_participants: number | null;
  is_members_only: boolean;
  status: string;
  participant_count?: number;
}

const EVENT_TYPES = ['training', 'competition', 'meeting', 'social', 'other'];
const EVENT_TYPE_LABELS: Record<string, string> = {
  training: 'Entraînement',
  competition: 'Compétition',
  meeting: 'Réunion',
  social: 'Sortie / Social',
  other: 'Autre',
};

const LEVELS = ['all', 'beginner', 'intermediate', 'advanced', 'elite'];
const LEVEL_LABELS: Record<string, string> = {
  all: 'Tous niveaux',
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
  elite: 'Élite',
};

const RECURRENCE_OPTIONS = [
  { value: '', label: 'Aucune' },
  { value: 'FREQ=WEEKLY', label: 'Chaque semaine' },
  { value: 'FREQ=WEEKLY;INTERVAL=2', label: 'Toutes les 2 semaines' },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const defaultForm = {
  title: '',
  event_type: 'training',
  sport: '',
  level: 'all',
  location: '',
  starts_at: '',
  max_participants: '',
  recurrence: '',
  is_members_only: false,
};

export default function ManageEventsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [clubId, setClubId] = useState<string | null>(null);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [cancelling, setCancelling] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/clubs/${slug}?by=slug`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.id) { setError('Club introuvable'); return; }
        setClubId(json.id);
      })
      .catch(() => setError('Erreur chargement club'));
  }, [slug]);

  const loadEvents = () => {
    if (!clubId) return;
    setLoading(true);
    fetch(`/api/clubs/${clubId}/events`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadEvents(); }, [clubId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId) return;
    setFormError(null);
    setFormSuccess(false);

    if (!form.title.trim() || !form.starts_at) {
      setFormError('Le titre et la date sont requis.');
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        event_type: form.event_type,
        sport: form.sport.trim() || null,
        level: form.level,
        location: form.location.trim() || null,
        starts_at: new Date(form.starts_at).toISOString(),
        max_participants: form.max_participants ? parseInt(form.max_participants, 10) : null,
        is_members_only: form.is_members_only,
      };
      if (form.recurrence) {
        body.recurrence_rule = form.recurrence;
      }

      const res = await fetch(`/api/clubs/${clubId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur lors de la création');

      setForm(defaultForm);
      setFormSuccess(true);
      loadEvents();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (eventId: string) => {
    if (!clubId || !confirm('Annuler cet événement ?')) return;
    setCancelling((prev) => ({ ...prev, [eventId]: true }));
    try {
      await fetch(`/api/clubs/${clubId}/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      loadEvents();
    } finally {
      setCancelling((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Événements</h1>
        <Link href={`/clubs/${slug}/manage`} className="text-sm text-brand-600 hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Create event form */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-700">Créer un événement</h2>
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
          )}
          {formSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">Événement créé avec succès !</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Entraînement cardio du mardi"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.event_type}
                onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            {/* Sport */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sport</label>
              <input
                type="text"
                value={form.sport}
                onChange={(e) => setForm((f) => ({ ...f, sport: e.target.value }))}
                placeholder="Ex: Football, Natation..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
              <select
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Adresse ou nom du lieu"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date et heure *</label>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Max participants */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Participants max</label>
              <input
                type="number"
                min="1"
                value={form.max_participants}
                onChange={(e) => setForm((f) => ({ ...f, max_participants: e.target.value }))}
                placeholder="Illimité si vide"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Recurrence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Récurrence</label>
              <select
                value={form.recurrence}
                onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {RECURRENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Members only */}
            <div className="flex items-center gap-3">
              <input
                id="members-only"
                type="checkbox"
                checked={form.is_members_only}
                onChange={(e) => setForm((f) => ({ ...f, is_members_only: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="members-only" className="text-sm font-medium text-gray-700">
                Réservé aux membres
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-500 py-3 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Création en cours...' : 'Créer l\'événement'}
          </button>
        </form>
      </section>

      {/* Upcoming events list */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-700">
          Événements à venir {!loading && `(${events.length})`}
        </h2>
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-200" />)}
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">Aucun événement à venir.</p>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{ev.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500 capitalize">{formatDate(ev.starts_at)}</p>
                  {ev.location && <p className="text-xs text-gray-400 truncate">{ev.location}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-500">
                    {ev.participant_count ?? 0} {ev.max_participants ? `/ ${ev.max_participants}` : ''} participants
                  </span>
                  <button
                    onClick={() => handleCancel(ev.id)}
                    disabled={cancelling[ev.id]}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

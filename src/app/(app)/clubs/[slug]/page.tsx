'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useClubsStore, ClubEvent } from '@/stores/clubs';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Announcement {
  id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
  profiles?: { first_name: string; avatar_url: string | null };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const JOIN_MODE_LABELS: Record<string, string> = {
  open: 'Ouvert',
  approval: 'Sur validation',
  invite: 'Sur invitation',
};

const JOIN_MODE_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  approval: 'bg-yellow-100 text-yellow-700',
  invite: 'bg-gray-100 text-gray-600',
};

// ─── Skeletons ────────────────────────────────────────────────────────────────

function SkeletonBanner() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-48 w-full rounded-xl bg-gray-200" />
      <div className="flex items-end gap-4 -mt-10 pl-6">
        <div className="h-20 w-20 rounded-full bg-gray-300 border-4 border-white" />
        <div className="space-y-2 pb-1">
          <div className="h-6 w-48 rounded bg-gray-200" />
          <div className="h-4 w-24 rounded bg-gray-200" />
        </div>
      </div>
      <div className="space-y-2 px-1">
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-3/4 rounded bg-gray-200" />
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClubStorefrontPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { fetchClub, fetchMyClubs, activeClub, myClubs, loading } = useClubsStore();

  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loadingExtras, setLoadingExtras] = useState(false);

  // Fetch club + membership
  useEffect(() => {
    fetchMyClubs().then(() => fetchClub(slug));
  }, [slug, fetchClub, fetchMyClubs]);

  const isMember = myClubs.some((c) => c.slug === slug);

  // Fetch events (public) and announcements (members only) once club is loaded
  useEffect(() => {
    if (!activeClub || activeClub.slug !== slug) return;

    setLoadingExtras(true);
    const promises: Promise<void>[] = [];

    // Events — public endpoint
    promises.push(
      fetch(`/api/clubs/${activeClub.id}/events`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data: ClubEvent[]) => {
          setEvents(Array.isArray(data) ? data.slice(0, 3) : []);
        })
        .catch(() => {}),
    );

    // Announcements — members only, fail silently for non-members
    if (isMember) {
      promises.push(
        fetch(`/api/clubs/${activeClub.id}/announcements`)
          .then((r) => (r.ok ? r.json() : []))
          .then((data: Announcement[]) => {
            if (Array.isArray(data) && data.length > 0) {
              setAnnouncement(data[0]);
            }
          })
          .catch(() => {}),
      );
    }

    Promise.all(promises).finally(() => setLoadingExtras(false));
  }, [activeClub, slug, isMember]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading || !activeClub || activeClub.slug !== slug) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <SkeletonBanner />
      </div>
    );
  }

  const club = activeClub;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">

      {/* ── Banner ──────────────────────────────────────────────────────────── */}
      <div className="relative">
        {club.banner_url ? (
          <img
            src={club.banner_url}
            alt={`Bannière ${club.name}`}
            className="h-48 w-full object-cover rounded-xl"
          />
        ) : (
          <div className="h-48 w-full rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500" />
        )}

        {/* ── Logo + Name ─────────────────────────────────────────────────── */}
        <div className="flex items-end gap-4 -mt-10 relative pl-4">
          <div className="h-20 w-20 shrink-0 rounded-full border-4 border-white bg-brand-100 flex items-center justify-center overflow-hidden shadow-md">
            {club.logo_url ? (
              <img src={club.logo_url} alt={club.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-brand-600">
                {club.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="pb-1">
            <h1 className="text-2xl font-bold text-gray-900">{club.name}</h1>
            {club.city && <p className="text-sm text-gray-500">{club.city}</p>}
          </div>
        </div>
      </div>

      {/* ── Description ─────────────────────────────────────────────────────── */}
      {club.description && (
        <p className="text-gray-700 leading-relaxed">{club.description}</p>
      )}

      {/* ── Info badges ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        {club.sports.map((sport) => (
          <span
            key={sport}
            className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 border border-brand-200"
          >
            {sport}
          </span>
        ))}
        {club.levels.map((level) => (
          <span
            key={level}
            className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-200"
          >
            {level}
          </span>
        ))}
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${JOIN_MODE_COLORS[club.join_mode] ?? 'bg-gray-100 text-gray-600'}`}
        >
          {JOIN_MODE_LABELS[club.join_mode] ?? club.join_mode}
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          {club.member_count ?? 0} membre{(club.member_count ?? 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Action section ──────────────────────────────────────────────────── */}
      {!isMember ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col items-center gap-4 text-center shadow-sm">
          <p className="text-gray-600 text-sm">
            Rejoignez ce club pour accéder au fil, aux événements et aux annonces.
          </p>
          <Link
            href={`/clubs/${slug}/join`}
            className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            Rejoindre ce club
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href={`/clubs/${slug}/feed`}
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-center hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">💬</span>
            <span className="text-sm font-medium text-gray-700">Fil</span>
          </Link>
          <Link
            href={`/clubs/${slug}/events`}
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-center hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">📅</span>
            <span className="text-sm font-medium text-gray-700">Événements</span>
          </Link>
          <Link
            href={`/clubs/${slug}/members`}
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-center hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">👥</span>
            <span className="text-sm font-medium text-gray-700">Membres</span>
          </Link>
          <Link
            href={`/clubs/${slug}/announcements`}
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-center hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">📢</span>
            <span className="text-sm font-medium text-gray-700">Annonces</span>
          </Link>
        </div>
      )}

      {/* ── Upcoming events preview ──────────────────────────────────────────── */}
      {(loadingExtras || events.length > 0) && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Prochains événements</h2>
          {loadingExtras ? (
            <div className="space-y-3 animate-pulse">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-gray-200" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{event.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500 capitalize">
                      {formatDate(event.starts_at)}
                    </p>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <p className="text-sm font-semibold text-gray-700">
                      {event.participant_count ?? 0}
                    </p>
                    <p className="text-xs text-gray-500">participants</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Latest announcement (members only) ─────────────────────────────── */}
      {isMember && announcement && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Dernière annonce</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {announcement.is_pinned && (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                      Épinglée
                    </span>
                  )}
                  <h3 className="font-semibold text-gray-900 truncate">{announcement.title}</h3>
                </div>
                <p className="text-sm text-gray-700 line-clamp-3">{announcement.body}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              {announcement.profiles && (
                <>
                  <div className="h-5 w-5 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden">
                    {announcement.profiles.avatar_url ? (
                      <img
                        src={announcement.profiles.avatar_url}
                        alt={announcement.profiles.first_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-medium text-brand-600">
                        {announcement.profiles.first_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span>{announcement.profiles.first_name}</span>
                  <span>·</span>
                </>
              )}
              <span>
                {new Date(announcement.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

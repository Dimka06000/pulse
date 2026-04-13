'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useClubsStore } from '@/stores/clubs';

type NavItem = { href: string; icon: string; label: string };

const athleteNav: NavItem[] = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/planning', icon: '📅', label: 'Mon planning' },
  { href: '/progress', icon: '📊', label: 'Mes progrès' },
  { href: '/goals', icon: '🎯', label: 'Objectifs' },
  { href: '/nutrition', icon: '🥗', label: 'Nutrition' },
  { href: '/journal', icon: '📓', label: 'Journal' },
  { href: '/insights', icon: '🧠', label: 'Insights' },
];

const exploreNav: NavItem[] = [
  { href: '/explore', icon: '🔍', label: 'Coachs' },
  { href: '/explore?tab=events', icon: '🎪', label: 'Événements' },
  { href: '/explore/programs', icon: '📝', label: 'Programmes' },
  { href: '/community', icon: '🏆', label: 'Communauté' },
  { href: '/messages', icon: '💬', label: 'Messages' },
  { href: '/clubs', icon: '🏟️', label: 'Clubs' },
];

const coachNav: NavItem[] = [
  { href: '/coach', icon: '📊', label: 'Tableau de bord' },
  { href: '/coach/agenda', icon: '📅', label: 'Agenda' },
  { href: '/coach/clients', icon: '👥', label: 'Mes clients' },
  { href: '/coach/sessions', icon: '📋', label: 'Mes séances' },
  { href: '/coach/programs', icon: '📝', label: 'Programmes' },
  { href: '/coach/revenue', icon: '💰', label: 'Revenus' },
  { href: '/coach/profile', icon: '✏️', label: 'Mon profil' },
];

const coachNavMore: NavItem[] = [
  { href: '/coach/pricing', icon: '🏷️', label: 'Tarifs' },
  { href: '/coach/availability', icon: '🕐', label: 'Disponibilités' },
  { href: '/coach/reviews', icon: '⭐', label: 'Avis' },
  { href: '/coach/events', icon: '🎪', label: 'Événements' },
  { href: '/coach/collabs', icon: '🤝', label: 'Collaborations' },
  { href: '/coach/training', icon: '🎓', label: 'Formations' },
  { href: '/coach/team', icon: '👥', label: 'Équipe' },
  { href: '/coach/videos', icon: '🎬', label: 'Vidéos' },
];

function NavSection({ title, items, titleColor }: { title: string; items: NavItem[]; titleColor?: string }) {
  const pathname = usePathname();
  return (
    <div className="mb-2">
      <p className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-widest ${titleColor || 'text-muted'}`}>
        {title}
      </p>
      {items.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={`mx-2 mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${
              active
                ? 'bg-gradient-to-r from-brand-500/8 to-cyan-500/8 font-semibold text-text'
                : 'text-muted hover:bg-surface hover:text-text'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function CoachMoreSection() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center gap-1 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-violet-500 hover:text-violet-700 transition-colors"
      >
        <span className="text-[10px]">{open ? '▾' : '▸'}</span>
        Plus
      </button>
      {open &&
        coachNavMore.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mx-2 mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                active
                  ? 'bg-gradient-to-r from-brand-500/8 to-cyan-500/8 font-semibold text-text'
                  : 'text-muted hover:bg-surface hover:text-text'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
    </div>
  );
}

export function Sidebar() {
  const { userRole, userId } = useAuthStore();
  const isCoach = userRole === 'coach' || userRole === 'both';

  const { myClubs: rawMyClubs, activeClubSlug, setActiveClub, fetchMyClubs } = useClubsStore();
  const myClubs = rawMyClubs || [];

  useEffect(() => {
    if (userId) fetchMyClubs();
  }, [userId, fetchMyClubs]);

  const activeSlug = activeClubSlug || myClubs[0]?.slug;
  const activeClubMembership = myClubs.find((c) => c.slug === activeSlug);
  const isClubAdmin =
    activeClubMembership?.role === 'founder' || activeClubMembership?.role === 'coach_admin';

  const clubNav: NavItem[] = activeSlug
    ? [
        { href: `/clubs/${activeSlug}`, icon: '🏠', label: 'Mon club' },
        { href: `/clubs/${activeSlug}/feed`, icon: '📰', label: 'Fil' },
        { href: `/clubs/${activeSlug}/events`, icon: '📅', label: 'Événements' },
        { href: `/clubs/${activeSlug}/members`, icon: '👥', label: 'Membres' },
        { href: `/clubs/${activeSlug}/announcements`, icon: '📢', label: 'Annonces' },
      ]
    : [];

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-border/50 md:bg-white">
      {/* Logo */}
      <div className="border-b border-border/50 px-5 py-4">
        <Link href="/dashboard" className="text-xl font-extrabold">
          <span className="bg-gradient-to-r from-brand-500 to-cyan-500 bg-clip-text text-transparent">
            Pulse
          </span>
        </Link>
      </div>

      {/* Nav sections */}
      <div className="flex-1 overflow-y-auto py-3">
        <NavSection title="Mon sport" items={athleteNav} />
        <NavSection title="Explorer" items={exploreNav} />

        {myClubs.length > 0 && (
          <div className="mb-2">
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
              Mon club
            </p>
            {myClubs.length > 1 && (
              <div className="mx-2 mb-1 px-3">
                <select
                  value={activeSlug ?? ''}
                  onChange={(e) => setActiveClub(e.target.value)}
                  className="w-full rounded-md border border-border/50 bg-surface px-2 py-1 text-[12px] text-muted focus:outline-none"
                >
                  {myClubs.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <NavSection title="" items={clubNav} />
            {isClubAdmin && (
              <NavSection
                title=""
                items={[{ href: `/clubs/${activeSlug}/manage`, icon: '⚙️', label: 'Gérer mon club' }]}
              />
            )}
          </div>
        )}

        {isCoach && (
          <>
            <NavSection title="Espace coach" items={coachNav} titleColor="text-violet-500" />
            <CoachMoreSection />
          </>
        )}
      </div>

      {/* User footer */}
      <div className="border-t border-border/50 px-4 py-3">
        <Link href="/profile" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 text-xs font-bold text-white">
            P
          </div>
          <div>
            <p className="text-[13px] font-semibold text-text">Mon profil</p>
            <p className="text-[11px] text-muted">{isCoach ? 'Sportif \u00b7 Coach' : 'Sportif'}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useClubsStore } from '@/stores/clubs';
import { useSidebar } from './sidebar-context';

type NavItem = { href: string; icon: string; label: string };

const athleteNav: NavItem[] = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/planning', icon: '📅', label: 'Planning' },
  { href: '/programs', icon: '📋', label: 'Programmes' },
  { href: '/progress', icon: '📊', label: 'Progres' },
  { href: '/goals', icon: '🎯', label: 'Objectifs' },
  { href: '/nutrition', icon: '🥗', label: 'Nutrition' },
];

const exploreNav: NavItem[] = [
  { href: '/explore', icon: '🔍', label: 'Explorer' },
  { href: '/explore/programs', icon: '🏆', label: 'Marketplace' },
  { href: '/messages', icon: '💬', label: 'Messages' },
];

const coachNav: NavItem[] = [
  { href: '/coach', icon: '📊', label: 'Dashboard' },
  { href: '/coach/agenda', icon: '📅', label: 'Agenda' },
  { href: '/coach/clients', icon: '👥', label: 'Clients' },
  { href: '/coach/programs', icon: '📋', label: 'Programmes' },
  { href: '/coach/revenue', icon: '💰', label: 'Revenus' },
];

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all ${
        collapsed ? 'justify-center mx-1' : 'mx-2'
      } ${
        active
          ? 'bg-brand-50 font-semibold text-brand-700'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <span className={collapsed ? 'text-lg' : 'text-base'}>{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function NavSection({
  title,
  items,
  collapsed,
}: {
  title: string;
  items: NavItem[];
  collapsed: boolean;
}) {
  return (
    <div className="mb-1">
      {!collapsed && title && (
        <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {title}
        </p>
      )}
      {collapsed && title && <div className="mx-3 my-1 h-px bg-gray-100" />}
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavLink key={item.href + item.label} item={item} collapsed={collapsed} />
        ))}
      </div>
    </div>
  );
}

export function Sidebar() {
  const { userRole, userId } = useAuthStore();
  const isCoach = userRole === 'coach' || userRole === 'both';
  const { collapsed, toggle } = useSidebar();

  const { myClubs: rawMyClubs, activeClubSlug, setActiveClub, fetchMyClubs } = useClubsStore();
  const myClubs = rawMyClubs || [];

  useEffect(() => {
    if (userId) fetchMyClubs();
  }, [userId, fetchMyClubs]);

  const activeSlug = activeClubSlug || myClubs[0]?.slug;

  const clubNav: NavItem[] = activeSlug
    ? [
        { href: `/clubs/${activeSlug}`, icon: '🏟️', label: 'Mon club' },
        { href: `/clubs/${activeSlug}/feed`, icon: '📰', label: 'Fil' },
        { href: `/clubs/${activeSlug}/events`, icon: '📅', label: 'Events' },
      ]
    : [];

  return (
    <aside
      className={`hidden md:flex md:flex-col border-r border-gray-100 bg-white transition-all duration-200 ${
        collapsed ? 'md:w-[60px]' : 'md:w-56'
      }`}
    >
      {/* Logo + toggle */}
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-3">
        {!collapsed && (
          <Link href="/dashboard" className="text-lg font-extrabold">
            <span className="bg-gradient-to-r from-brand-500 to-cyan-500 bg-clip-text text-transparent">
              Pulse
            </span>
          </Link>
        )}
        <button
          onClick={toggle}
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition ${
            collapsed ? 'mx-auto' : ''
          }`}
          title={collapsed ? 'Ouvrir le menu' : 'Fermer le menu'}
        >
          {collapsed ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-2">
        <NavSection title="" items={athleteNav} collapsed={collapsed} />
        <NavSection title="Explorer" items={exploreNav} collapsed={collapsed} />

        {myClubs.length > 0 && (
          <NavSection title="Club" items={clubNav} collapsed={collapsed} />
        )}

        {isCoach && (
          <NavSection title="Coach" items={coachNav} collapsed={collapsed} />
        )}
      </div>

      {/* User footer */}
      <div className="border-t border-gray-100 px-2 py-2">
        <Link
          href="/profile"
          className={`flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50 transition ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white shrink-0">
            P
          </div>
          {!collapsed && (
            <span className="text-xs font-medium text-gray-600 truncate">Profil</span>
          )}
        </Link>
      </div>
    </aside>
  );
}

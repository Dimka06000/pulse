'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useClubsStore } from '@/stores/clubs';
import { useSidebar } from './sidebar-context';

type NavItem = { href: string; icon: string; label: string; badge?: number };

// ── Main navigation (everyone sees this) ──────────────────────────────────
const mainNav: NavItem[] = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/nutrition', icon: '🥗', label: 'Nutrition' },
  { href: '/planning', icon: '📅', label: 'Planning' },
  { href: '/messages', icon: '💬', label: 'Messages' },
  { href: '/programs', icon: '📋', label: 'Programmes' },
  { href: '/progress', icon: '📊', label: 'Evolution' },
];

// ── Explore (single entry) ────────────────────────────────────────────────
const exploreNav: NavItem[] = [
  { href: '/explore', icon: '🔍', label: 'Explorer' },
];

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const active =
    item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(item.href);

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
      {!collapsed && (
        <span className="truncate flex-1">{item.label}</span>
      )}
      {!collapsed && item.badge && item.badge > 0 && (
        <span className="text-[10px] font-bold bg-red-500 text-white rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({ title, collapsed }: { title: string; collapsed: boolean }) {
  if (collapsed) return <div className="mx-3 my-2 h-px bg-gray-100" />;
  return (
    <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
      {title}
    </p>
  );
}

export function Sidebar() {
  const { userRole, userId } = useAuthStore();
  const isCoach = userRole === 'coach' || userRole === 'both';
  const { collapsed, toggle } = useSidebar();

  const { myClubs: rawMyClubs, activeClubSlug, fetchMyClubs } = useClubsStore();
  const myClubs = rawMyClubs || [];

  useEffect(() => {
    if (userId) fetchMyClubs();
  }, [userId, fetchMyClubs]);

  const activeSlug = activeClubSlug || myClubs[0]?.slug;

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
        {/* Main nav */}
        <div className="space-y-0.5">
          {mainNav.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} />
          ))}
        </div>

        {/* Explorer */}
        <SectionLabel title="Decouvrir" collapsed={collapsed} />
        <div className="space-y-0.5">
          {exploreNav.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} />
          ))}
        </div>

        {/* Coach — dedicated view link */}
        {isCoach && (
          <>
            <SectionLabel title="Coach" collapsed={collapsed} />
            <NavLink
              item={{ href: '/coach', icon: '🎓', label: 'Espace coach' }}
              collapsed={collapsed}
            />
          </>
        )}

        {/* Club — dedicated view link */}
        {myClubs.length > 0 && activeSlug && (
          <>
            <SectionLabel title="Club" collapsed={collapsed} />
            <NavLink
              item={{ href: `/clubs/${activeSlug}`, icon: '🏟️', label: 'Mon club' }}
              collapsed={collapsed}
            />
          </>
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

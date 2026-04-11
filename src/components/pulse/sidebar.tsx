'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

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
];

const coachNav: NavItem[] = [
  { href: '/coach', icon: '📊', label: 'Tableau de bord' },
  { href: '/coach/agenda', icon: '📅', label: 'Agenda' },
  { href: '/coach/clients', icon: '👥', label: 'Mes clients' },
  { href: '/coach/sessions', icon: '📋', label: 'Mes séances' },
  { href: '/coach/pricing', icon: '🏷️', label: 'Tarifs' },
  { href: '/coach/revenue', icon: '💰', label: 'Revenus' },
  { href: '/coach/reviews', icon: '⭐', label: 'Avis' },
  { href: '/coach/availability', icon: '🕐', label: 'Disponibilités' },
  { href: '/coach/events', icon: '🎪', label: 'Événements' },
  { href: '/coach/training', icon: '🎓', label: 'Formations' },
  { href: '/coach/team', icon: '👥', label: 'Équipe' },
  { href: '/coach/programs', icon: '📝', label: 'Programmes' },
  { href: '/coach/videos', icon: '🎬', label: 'Vidéos' },
  { href: '/coach/profile', icon: '✏️', label: 'Mon profil' },
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

export function Sidebar() {
  const { userRole } = useAuthStore();
  const isCoach = userRole === 'coach' || userRole === 'both';

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
        {isCoach && <NavSection title="Espace coach" items={coachNav} titleColor="text-violet-500" />}
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

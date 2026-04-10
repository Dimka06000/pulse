'use client';

import { useAuthStore } from '@/stores/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/pulse/empty-state';

type NavItem = { href: string; icon: string; label: string };

const coachSidebarNav: NavItem[] = [
  { href: '/coach', icon: '📊', label: 'Tableau de bord' },
  { href: '/coach/clients', icon: '👥', label: 'Mes clients' },
  { href: '/coach/sessions', icon: '📋', label: 'Mes séances' },
  { href: '/coach/revenue', icon: '💰', label: 'Revenus' },
  { href: '/coach/reviews', icon: '⭐', label: 'Avis' },
  { href: '/coach/availability', icon: '🕐', label: 'Disponibilités' },
  { href: '/coach/events', icon: '🎪', label: 'Événements' },
];

function CoachSubNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border/50 bg-white md:border-b-0">
      {/* Mobile: horizontal scrollable nav */}
      <div className="flex gap-1 overflow-x-auto px-4 py-2 md:hidden">
        {coachSidebarNav.map((item) => {
          const active = item.href === '/coach'
            ? pathname === '/coach'
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                active
                  ? 'bg-gradient-to-r from-violet-500/10 to-purple-500/10 text-violet-700'
                  : 'text-muted hover:bg-surface'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Desktop: vertical sidebar already provided by main sidebar's coachNav */}
    </nav>
  );
}

// Skeleton loader for coach pages
function CoachSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-4 w-64 animate-pulse rounded-lg bg-gray-100" />
      </div>
      {/* Cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
      {/* List skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const { userRole } = useAuthStore();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  // Timeout after 3 seconds — if userRole is still null, show become-a-coach CTA
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const isCoach = userRole === 'coach';
  const isLoading = !userRole && !timedOut;

  // Still loading — show skeleton
  if (isLoading) {
    return <CoachSkeleton />;
  }

  // Not a coach (or not logged in after timeout) — show become-a-coach CTA
  if (!isCoach) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md w-full">
          <EmptyState
            icon="🏋️"
            title="Devenez coach sur Pulse"
            description="Partagez votre expertise, gérez vos clients, vos séances et vos revenus depuis un seul espace dédié."
            actionLabel="Créer mon profil coach"
            onAction={() => router.push('/profile')}
          />
        </div>
      </div>
    );
  }

  // User is a coach — render coach content with sub-nav
  return (
    <div className="flex-1">
      <CoachSubNav />
      {children}
    </div>
  );
}

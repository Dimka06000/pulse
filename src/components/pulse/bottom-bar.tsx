'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

const tabs = [
  { href: '/dashboard', icon: '🏠', label: 'Accueil' },
  { href: '/planning', icon: '📅', label: 'Planning' },
  { href: '/programs', icon: '📋', label: 'Programmes' },
  { href: '/messages', icon: '💬', label: 'Messages' },
  { href: '/explore', icon: '🔍', label: 'Explorer' },
];

export function BottomBar() {
  const pathname = usePathname();
  const { userRole } = useAuthStore();
  const isCoach = userRole === 'coach' || userRole === 'both';

  // Don't show bottom bar in immersive modes
  if (pathname.startsWith('/workout/')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-xl md:hidden">
      <div className="flex justify-around pb-[env(safe-area-inset-bottom)] pt-1">
        {tabs.map((tab) => {
          const active = tab.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} className="relative flex flex-col items-center px-3 py-2">
              {active && (
                <div className="absolute -top-1 h-0.5 w-5 rounded-full bg-brand-500" />
              )}
              <span className={`text-xl ${active ? '' : 'opacity-35'}`}>{tab.icon}</span>
              <span className={`text-[10px] font-semibold ${active ? 'text-brand-600' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

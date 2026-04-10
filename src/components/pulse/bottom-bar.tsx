'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/dashboard', icon: '🏠', label: 'Accueil' },
  { href: '/explore', icon: '🔍', label: 'Explorer' },
  { href: '/planning', icon: '📅', label: 'Planning' },
  { href: '/messages', icon: '💬', label: 'Messages' },
  { href: '/profile', icon: '👤', label: 'Profil' },
];

export function BottomBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-white/95 backdrop-blur-xl md:hidden">
      <div className="flex justify-around pb-[env(safe-area-inset-bottom)] pt-1">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} className="relative flex flex-col items-center px-3 py-2">
              {active && (
                <div className="absolute -top-1 h-0.5 w-5 rounded-full bg-gradient-to-r from-brand-500 to-cyan-500" />
              )}
              <span className={`text-xl ${active ? '' : 'opacity-35'}`}>{tab.icon}</span>
              <span className={`text-[10px] font-semibold ${active ? 'bg-gradient-to-r from-brand-500 to-cyan-500 bg-clip-text text-transparent' : 'text-muted/40'}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

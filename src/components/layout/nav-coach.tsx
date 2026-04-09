'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/sessions', label: 'Séances', icon: '🏋️' },
  { href: '/clients', label: 'Clients', icon: '👥' },
  { href: '/team', label: 'Équipe', icon: '🤝' },
  { href: '/collabs', label: 'Collabs', icon: '🔗' },
  { href: '/earnings', label: 'Revenus', icon: '💰' },
  { href: '/events/manage', label: 'Events', icon: '🎯' },
  { href: '/reviews', label: 'Avis', icon: '⭐' },
  { href: '/training', label: 'Formation', icon: '📚' },
  { href: '/coach/profile/edit', label: 'Mon profil', icon: '👤' },
];

export function NavCoach() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile horizontal scrollable nav */}
      <nav className="border-b border-gray-200 bg-white md:hidden">
        <div className="flex items-center gap-1 overflow-x-auto px-3 py-2 scrollbar-hide">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-gray-200 md:bg-gray-50">
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-brand-50 text-brand-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

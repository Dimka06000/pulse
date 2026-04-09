'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/admin', label: 'Tableau de bord', icon: '📊' },
  { href: '/admin/coaches', label: 'Coachs', icon: '🏅' },
  { href: '/admin/bookings', label: 'Réservations', icon: '📅' },
  { href: '/admin/payments', label: 'Paiements', icon: '💳' },
  { href: '/admin/ratings', label: 'Avis', icon: '⭐' },
];

export function NavAdmin() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile horizontal scrollable nav */}
      <nav className="border-b border-gray-200 bg-white md:hidden">
        <div className="flex items-center gap-1 overflow-x-auto px-3 py-2 scrollbar-hide">
          {links.map((link) => {
            const active =
              link.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(link.href);
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
        <div className="px-4 py-5">
          <h2 className="text-sm font-semibold text-gray-900 font-display tracking-wide">
            Administration
          </h2>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3 pt-0">
          {links.map((link) => {
            const active =
              link.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(link.href);
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

'use client';

import Link from 'next/link';

interface AppHeaderProps {
  greeting?: string;
  title: string;
  initials?: string;
}

export function AppHeader({ greeting, title, initials = 'P' }: AppHeaderProps) {
  return (
    <header className="border-b border-border/50 bg-white px-4 py-3 md:hidden">
      <div className="flex items-center justify-between">
        <div>
          {greeting && <p className="text-xs text-muted">{greeting}</p>}
          <h1 className="text-lg font-extrabold text-text">{title}</h1>
        </div>
        <Link href="/profile">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 text-sm font-bold text-white">
            {initials}
          </div>
        </Link>
      </div>
    </header>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { RoleSwitch } from './role-switch';
import { Button } from '../ui/button';

export function Header() {
  const router = useRouter();
  const { userId, clear } = useAuthStore();

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    clear();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="font-display text-xl font-semibold text-brand-700">
          Coaching
        </Link>

        <div className="flex items-center gap-3">
          <RoleSwitch />
          {userId ? (
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Déconnexion
            </Button>
          ) : (
            <Link href="/login">
              <Button variant="secondary" size="sm">
                Connexion
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

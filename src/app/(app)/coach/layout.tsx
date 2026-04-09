'use client';

import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const { userRole } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (userRole && userRole !== 'coach' && userRole !== 'both') {
      router.replace('/dashboard');
    }
  }, [userRole, router]);

  if (!userRole || (userRole !== 'coach' && userRole !== 'both')) {
    return (
      <div className="flex items-center justify-center p-20">
        <p className="text-muted">Chargement...</p>
      </div>
    );
  }

  return <>{children}</>;
}

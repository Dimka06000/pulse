'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';

export function BecomeCoachButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { setUser, userId, setActiveRole } = useAuthStore();

  async function handleBecomeCoach() {
    setLoading(true);
    setError('');
    try {
      await api.post('/api/coaches', {});
      // Update local store: user is now 'both'
      if (userId) {
        setUser(userId, 'both' as any);
      }
      setActiveRole('coach');
      router.push('/coach/profile/edit');
    } catch (err: any) {
      setError(err.message ?? 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-6 text-center">
      <h3 className="text-lg font-semibold text-gray-900">
        Devenez coach
      </h3>
      <p className="mt-2 text-sm text-gray-600">
        Partagez votre expertise et aidez les sportifs a progresser.
        Creez votre profil coach en quelques minutes.
      </p>
      <Button
        onClick={handleBecomeCoach}
        disabled={loading}
        className="mt-4"
      >
        {loading ? 'Creation en cours...' : 'Creer mon profil coach'}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

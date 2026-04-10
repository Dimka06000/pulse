'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function StripeOnboardingPage() {
  const [status, setStatus] = useState<{
    connected: boolean;
    detailsSubmitted?: boolean;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/stripe/status')
      .then((r) => r.json())
      .then(setStatus);
  }, []);

  async function handleOnboard() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/onboard', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      alert('Erreur de connexion à Stripe');
    } finally {
      setLoading(false);
    }
  }

  if (!status) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded-2xl bg-surface" />
        <div className="h-40 w-full animate-pulse rounded-2xl bg-surface" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-6">
        Paiements Stripe
      </h1>

      {status.connected && status.chargesEnabled ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
          <h2 className="font-semibold text-green-800">Compte connecté</h2>
          <p className="text-sm text-green-600 mt-2">
            Votre compte Stripe est actif. Les paiements de vos athlètes arrivent directement sur votre compte.
          </p>
          <div className="mt-4 space-y-1 text-sm">
            <p>Détails soumis : {status.detailsSubmitted ? 'Oui' : 'Non'}</p>
            <p>Paiements actifs : {status.chargesEnabled ? 'Oui' : 'Non'}</p>
            <p>Virements actifs : {status.payoutsEnabled ? 'Oui' : 'Non'}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Configurer vos paiements</h2>
          <p className="text-sm text-gray-600">
            Pour recevoir les paiements de vos athlètes, connectez votre compte Stripe.
            La plateforme prélève une commission de 5% par séance.
          </p>
          <Button onClick={handleOnboard} disabled={loading}>
            {loading ? 'Redirection...' : 'Connecter Stripe'}
          </Button>
        </div>
      )}
    </div>
  );
}

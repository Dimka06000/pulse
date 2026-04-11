'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

type StripeStatus = {
  connected: boolean;
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  accountId?: string;
};

const STEPS = [
  { key: 'create', label: 'Créer le compte', icon: '1' },
  { key: 'details', label: 'Informations', icon: '2' },
  { key: 'active', label: 'Paiements actifs', icon: '3' },
];

export default function StripeOnboardingPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [justReturned] = useState(searchParams.get('return') === 'true');

  const fetchStatus = () => {
    fetch('/api/stripe/status')
      .then(r => r.ok ? r.json() : { connected: false })
      .then(setStatus)
      .catch(() => setStatus({ connected: false }));
  };

  useEffect(() => { fetchStatus(); }, []);

  // Refresh status if just returned from Stripe
  useEffect(() => {
    if (justReturned) {
      const interval = setInterval(fetchStatus, 3000);
      const timeout = setTimeout(() => clearInterval(interval), 30000);
      return () => { clearInterval(interval); clearTimeout(timeout); };
    }
  }, [justReturned]);

  const handleOnboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/onboard', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Erreur de connexion à Stripe');
      }
    } catch {
      alert('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-surface" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface" />
      </div>
    );
  }

  const currentStep = !status.connected ? 0 : !status.detailsSubmitted ? 1 : status.chargesEnabled ? 3 : 2;
  const isComplete = status.connected && status.chargesEnabled;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 md:py-8">
      <h1 className="text-xl font-extrabold text-text mb-2">Paiements</h1>
      <p className="text-sm text-muted mb-6">
        Recevez les paiements de vos athlètes directement sur votre compte bancaire.
      </p>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep && !isComplete;
          return (
            <div key={step.key} className="flex items-center gap-2 flex-1">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                done ? 'bg-brand-500 text-white' :
                active ? 'bg-brand-500/10 text-brand-500 ring-2 ring-brand-500' :
                'bg-surface text-muted'
              }`}>
                {done ? '✓' : step.icon}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${done ? 'text-brand-500' : active ? 'text-text' : 'text-muted'}`}>
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 rounded ${done ? 'bg-brand-500' : 'bg-surface'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Status card */}
      {isComplete ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 text-white text-xl">
              ✓
            </div>
            <div>
              <h2 className="text-lg font-bold text-green-800">Paiements actifs</h2>
              <p className="text-sm text-green-600">Votre compte Stripe est configuré</p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between rounded-xl bg-white/60 p-3">
              <span className="text-sm text-green-700">Paiements par carte</span>
              <span className="text-sm font-bold text-green-700">✓ Actif</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/60 p-3">
              <span className="text-sm text-green-700">Virements bancaires</span>
              <span className="text-sm font-bold text-green-700">{status.payoutsEnabled ? '✓ Actif' : '⏳ En cours'}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/60 p-3">
              <span className="text-sm text-green-700">Commission plateforme</span>
              <span className="text-sm font-bold text-green-700">5%</span>
            </div>
          </div>

          <p className="text-xs text-green-600">
            Vos athlètes peuvent maintenant réserver et payer vos séances. Vous recevez 95% du montant directement sur votre compte.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-white p-6">
          {/* Step-specific content */}
          {currentStep === 0 && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">💳</span>
                <div>
                  <h2 className="text-lg font-bold text-text">Connectez Stripe</h2>
                  <p className="text-sm text-muted">En 3 minutes, configurez vos paiements</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 rounded-xl bg-surface p-3">
                  <span className="text-lg">🔒</span>
                  <div>
                    <p className="text-sm font-semibold text-text">Sécurisé</p>
                    <p className="text-xs text-muted">Stripe est le leader mondial du paiement en ligne</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-surface p-3">
                  <span className="text-lg">⚡</span>
                  <div>
                    <p className="text-sm font-semibold text-text">Instantané</p>
                    <p className="text-xs text-muted">Recevez vos paiements sous 2 jours ouvrés</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-surface p-3">
                  <span className="text-lg">💰</span>
                  <div>
                    <p className="text-sm font-semibold text-text">95% pour vous</p>
                    <p className="text-xs text-muted">Pulse ne prend que 5% de commission</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {currentStep === 1 && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">📋</span>
                <div>
                  <h2 className="text-lg font-bold text-text">Complétez vos informations</h2>
                  <p className="text-sm text-muted">Stripe a besoin de vérifier votre identité</p>
                </div>
              </div>
              <p className="text-sm text-muted mb-6">
                Vous avez commencé la configuration mais il reste des informations à compléter (pièce d'identité, coordonnées bancaires...).
              </p>
            </>
          )}

          {currentStep === 2 && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">⏳</span>
                <div>
                  <h2 className="text-lg font-bold text-text">Vérification en cours</h2>
                  <p className="text-sm text-muted">Stripe vérifie vos informations</p>
                </div>
              </div>
              <p className="text-sm text-muted mb-6">
                Vos informations ont été soumises. L'activation peut prendre quelques minutes en mode test, ou 24-48h en production.
              </p>
            </>
          )}

          <button
            onClick={handleOnboard}
            disabled={loading || currentStep === 2}
            className="w-full rounded-xl bg-brand-500 py-3.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {loading ? 'Redirection vers Stripe...' :
             currentStep === 0 ? 'Configurer mes paiements →' :
             currentStep === 1 ? 'Reprendre la configuration →' :
             'Vérification en cours...'}
          </button>

          {justReturned && currentStep < 3 && (
            <p className="mt-3 text-center text-xs text-amber-600">
              Configuration en cours de vérification... Rafraîchissement automatique.
            </p>
          )}
        </div>
      )}

      {/* FAQ */}
      <div className="mt-8 space-y-3">
        <h3 className="text-sm font-bold text-text">Questions fréquentes</h3>
        <details className="rounded-xl border border-border bg-white">
          <summary className="px-4 py-3 text-sm font-medium text-text cursor-pointer">
            Quand est-ce que je reçois mon argent ?
          </summary>
          <p className="px-4 pb-3 text-xs text-muted">
            Les paiements sont virés sur votre compte bancaire sous 2 jours ouvrés après chaque séance.
          </p>
        </details>
        <details className="rounded-xl border border-border bg-white">
          <summary className="px-4 py-3 text-sm font-medium text-text cursor-pointer">
            Combien prend Pulse en commission ?
          </summary>
          <p className="px-4 pb-3 text-xs text-muted">
            Pulse prend 5% par transaction. Par exemple, pour une séance à 50€, vous recevez 47,50€ et Pulse prend 2,50€.
          </p>
        </details>
        <details className="rounded-xl border border-border bg-white">
          <summary className="px-4 py-3 text-sm font-medium text-text cursor-pointer">
            Quels moyens de paiement sont acceptés ?
          </summary>
          <p className="px-4 pb-3 text-xs text-muted">
            Carte bancaire (Visa, Mastercard, Amex), Apple Pay, Google Pay. Stripe gère tout automatiquement.
          </p>
        </details>
      </div>
    </div>
  );
}

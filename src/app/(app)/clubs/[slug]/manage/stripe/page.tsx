'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface StripeStatus {
  connected: boolean;
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  accountId?: string;
}

const STEPS = [
  { key: 'create', label: 'Créer le compte', icon: '1' },
  { key: 'details', label: 'Informations', icon: '2' },
  { key: 'active', label: 'Paiements actifs', icon: '3' },
];

export default function ClubStripeOnboardingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const [clubId, setClubId] = useState<string | null>(null);
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justReturned] = useState(searchParams.get('return') === 'true');

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/clubs/${slug}?by=slug`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.id) { setError('Club introuvable'); return; }
        setClubId(json.id);
      })
      .catch(() => setError('Erreur chargement club'));
  }, [slug]);

  const fetchStatus = () => {
    if (!clubId) return;
    fetch(`/api/clubs/${clubId}/stripe/status`)
      .then((r) => r.ok ? r.json() : { connected: false })
      .then(setStatus)
      .catch(() => setStatus({ connected: false }));
  };

  useEffect(() => { fetchStatus(); }, [clubId]);

  // Refresh status if just returned from Stripe
  useEffect(() => {
    if (!justReturned || !clubId) return;
    const interval = setInterval(fetchStatus, 3000);
    const timeout = setTimeout(() => clearInterval(interval), 30000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [justReturned, clubId]);

  const handleOnboard = async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/stripe/onboard`, { method: 'POST' });
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

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!clubId || !status) {
    return (
      <div className="mx-auto max-w-lg p-6 space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-40 rounded-2xl bg-gray-200" />
      </div>
    );
  }

  const currentStep = !status.connected ? 0 : !status.detailsSubmitted ? 1 : status.chargesEnabled ? 3 : 2;
  const isComplete = status.connected && status.chargesEnabled;

  return (
    <div className="mx-auto max-w-lg p-6 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Paiements du club</h1>
          <p className="text-sm text-gray-500 mt-1">
            Acceptez les abonnements et paiements membres directement.
          </p>
        </div>
        <Link href={`/clubs/${slug}/manage/settings`} className="text-sm text-brand-600 hover:underline shrink-0">
          ← Paramètres
        </Link>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep && !isComplete;
          return (
            <div key={step.key} className="flex items-center gap-2 flex-1">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                done ? 'bg-brand-500 text-white' :
                active ? 'bg-brand-500/10 text-brand-500 ring-2 ring-brand-500' :
                'bg-gray-100 text-gray-400'
              }`}>
                {done ? '✓' : step.icon}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${done ? 'text-brand-500' : active ? 'text-gray-900' : 'text-gray-400'}`}>
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 rounded ${done ? 'bg-brand-500' : 'bg-gray-200'}`} />
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
              <p className="text-sm text-green-600">Le compte Stripe du club est configuré</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-white/60 p-3">
              <span className="text-sm text-green-700">Paiements par carte</span>
              <span className="text-sm font-bold text-green-700">✓ Actif</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/60 p-3">
              <span className="text-sm text-green-700">Virements bancaires</span>
              <span className="text-sm font-bold text-green-700">
                {status.payoutsEnabled ? '✓ Actif' : '⏳ En cours'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/60 p-3">
              <span className="text-sm text-green-700">Commission plateforme</span>
              <span className="text-sm font-bold text-green-700">5%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          {currentStep === 0 && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">💳</span>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Connectez Stripe</h2>
                  <p className="text-sm text-gray-500">Activez les paiements pour votre club</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                  <span className="text-lg">🔒</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Sécurisé</p>
                    <p className="text-xs text-gray-500">Stripe est le leader mondial du paiement en ligne</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                  <span className="text-lg">💰</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">95% pour le club</p>
                    <p className="text-xs text-gray-500">Pulse ne prend que 5% de commission</p>
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
                  <h2 className="text-lg font-bold text-gray-900">Complétez les informations</h2>
                  <p className="text-sm text-gray-500">Stripe a besoin de vérifier votre identité</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                La configuration a été commencée mais il reste des informations à compléter.
              </p>
            </>
          )}

          {currentStep === 2 && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">⏳</span>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Vérification en cours</h2>
                  <p className="text-sm text-gray-500">Stripe vérifie vos informations</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Vos informations ont été soumises. L'activation peut prendre quelques minutes.
              </p>
            </>
          )}

          <button
            onClick={handleOnboard}
            disabled={loading || currentStep === 2}
            className="w-full rounded-xl bg-brand-500 py-3.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {loading ? 'Redirection vers Stripe...' :
             currentStep === 0 ? 'Configurer les paiements →' :
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
    </div>
  );
}

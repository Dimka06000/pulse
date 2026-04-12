'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Club {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  join_mode: 'open' | 'approval' | 'invite';
  city: string | null;
  description: string | null;
}

interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  interval: 'month' | 'year' | 'once' | null;
  includes_coaching: boolean;
  max_sessions_per_month: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(cents: number, interval: string | null): string {
  const amount = (cents / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (interval === 'month') return `${amount}€/mois`;
  if (interval === 'year') return `${amount}€/an`;
  return `${amount}€`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gray-200 shrink-0" />
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-gray-200" />
          <div className="h-4 w-24 rounded bg-gray-200" />
        </div>
      </div>
      <div className="h-24 rounded-xl bg-gray-200" />
      <div className="space-y-3">
        <div className="h-36 rounded-xl bg-gray-200" />
        <div className="h-36 rounded-xl bg-gray-200" />
      </div>
    </div>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  onSubscribe,
  loading,
}: {
  plan: MembershipPlan;
  onSubscribe: (planId: string) => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{plan.name}</h3>
            {plan.includes_coaching && (
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                Coaching inclus
              </span>
            )}
          </div>
          {plan.description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{plan.description}</p>
          )}
          {plan.max_sessions_per_month != null && (
            <p className="mt-1.5 text-xs text-gray-500">
              {plan.max_sessions_per_month} séance{plan.max_sessions_per_month !== 1 ? 's' : ''} / mois
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-bold text-brand-600">
            {formatPrice(plan.price_cents, plan.interval)}
          </p>
        </div>
      </div>

      <button
        onClick={() => onSubscribe(plan.id)}
        disabled={loading}
        className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Redirection...' : "S'abonner"}
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClubJoinPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [club, setClub] = useState<Club | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [joining, setJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);

  // Load club + plans + membership status
  useEffect(() => {
    if (!slug) return;

    async function load() {
      try {
        // Fetch club by slug
        const clubRes = await fetch(`/api/clubs/${slug}?by=slug`);
        const clubData = await clubRes.json();
        if (!clubRes.ok || !clubData.id) {
          setError('Club introuvable');
          return;
        }
        setClub(clubData);

        // Parallel: plans + my clubs (to check membership)
        const [plansRes, myClubsRes] = await Promise.all([
          fetch(`/api/clubs/${clubData.id}/plans`),
          fetch('/api/clubs?mine=true'),
        ]);

        const plansData = await plansRes.json();
        setPlans(Array.isArray(plansData) ? plansData : []);

        if (myClubsRes.ok) {
          const myClubs = await myClubsRes.json();
          if (Array.isArray(myClubs) && myClubs.some((c: any) => c.id === clubData.id || c.slug === slug)) {
            setIsMember(true);
          }
        }
      } catch {
        setError('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  async function handleFreeJoin() {
    if (!club) return;
    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${club.id}/members`, { method: 'POST' });
      const json = await res.json();

      if (res.status === 409) {
        // Already a member
        setIsMember(true);
        return;
      }
      if (!res.ok) {
        setError(json.error ?? 'Erreur lors de l\'adhésion');
        return;
      }

      if (json.status === 'pending') {
        setJoinSuccess('Demande envoyée, un administrateur validera votre adhésion');
      } else {
        router.push(`/clubs/${slug}`);
      }
    } catch {
      setError('Erreur lors de l\'adhésion');
    } finally {
      setJoining(false);
    }
  }

  async function handleSubscribe(planId: string) {
    if (!club) return;
    setSubscribingPlanId(planId);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${club.id}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Erreur lors de l\'abonnement');
        return;
      }
      if (json.url) {
        window.location.href = json.url;
      }
    } catch {
      setError('Erreur lors de l\'abonnement');
    } finally {
      setSubscribingPlanId(null);
    }
  }

  if (loading) return <Skeleton />;

  if (error && !club) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!club) return null;

  const paidPlans = plans.filter((p) => p.price_cents > 0);
  const showFreeSection = club.join_mode !== 'invite';

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-8">

      {/* ── Back link ──────────────────────────────────────────────────────── */}
      <Link
        href={`/clubs/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Retour au club
      </Link>

      {/* ── Club header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 rounded-full border-2 border-gray-200 bg-brand-100 flex items-center justify-center overflow-hidden shadow-sm">
          {club.logo_url ? (
            <img src={club.logo_url} alt={club.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-brand-600">
              {club.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{club.name}</h1>
          {club.city && <p className="text-sm text-gray-500">{club.city}</p>}
        </div>
      </div>

      {/* ── Already member ──────────────────────────────────────────────────── */}
      {isMember && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center space-y-3">
          <p className="text-green-800 font-medium">Vous êtes déjà membre de ce club</p>
          <Link
            href={`/clubs/${slug}`}
            className="inline-block rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            Accéder au club
          </Link>
        </div>
      )}

      {/* ── Join success message ─────────────────────────────────────────────── */}
      {joinSuccess && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-center">
          <p className="text-blue-800 font-medium">{joinSuccess}</p>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isMember && !joinSuccess && (
        <>
          {/* ── Free join section ──────────────────────────────────────────────── */}
          {showFreeSection && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Adhésion gratuite</h2>
                {club.join_mode === 'open' ? (
                  <p className="mt-1 text-sm text-gray-600">
                    Ce club est ouvert à tous. Rejoignez-le gratuitement dès maintenant.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-gray-600">
                    L'accès à ce club est soumis à validation par un administrateur.
                  </p>
                )}
              </div>

              <button
                onClick={handleFreeJoin}
                disabled={joining}
                className="w-full rounded-lg border-2 border-brand-600 px-4 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {joining
                  ? 'En cours...'
                  : club.join_mode === 'open'
                    ? 'Rejoindre gratuitement'
                    : 'Demander à rejoindre'}
              </button>
            </section>
          )}

          {/* ── Invite-only message ────────────────────────────────────────────── */}
          {club.join_mode === 'invite' && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
              <p className="text-gray-600 font-medium">Ce club est sur invitation uniquement</p>
              <p className="mt-1 text-sm text-gray-500">
                Contactez un administrateur du club pour obtenir une invitation.
              </p>
            </div>
          )}

          {/* ── Paid plans section ─────────────────────────────────────────────── */}
          {paidPlans.length > 0 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Plans d'adhésion</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Accédez à des avantages exclusifs avec un abonnement.
                </p>
              </div>
              <div className="space-y-3">
                {paidPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onSubscribe={handleSubscribe}
                    loading={subscribingPlanId === plan.id}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

interface Credit {
  id: string;
  coach_name: string;
  total_sessions: number;
  used_sessions: number;
  expires_at: string | null;
}

interface Subscription {
  id: string;
  coach_name: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  sessions_per_period: number;
}

export function CreditsDisplay() {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/credits').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/subscriptions').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([c, s]) => {
      setCredits(Array.isArray(c) ? c : []);
      setSubscriptions(Array.isArray(s) ? s : []);
    }).finally(() => setLoading(false));
  }, []);

  const handleCancel = async (subId: string) => {
    setCancelling(subId);
    const res = await fetch(`/api/subscriptions/${subId}/cancel`, { method: 'POST' });
    if (res.ok) {
      setSubscriptions(prev => prev.map(s =>
        s.id === subId ? { ...s, cancel_at_period_end: true } : s
      ));
    }
    setCancelling(null);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />)}
      </div>
    );
  }

  const activeCredits = credits.filter(c => c.used_sessions < c.total_sessions);
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');

  if (activeCredits.length === 0 && activeSubscriptions.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Subscriptions */}
      {activeSubscriptions.map(sub => (
        <div key={sub.id} className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-bold text-text">Abonnement — {sub.coach_name}</p>
              <p className="text-xs text-muted">
                {sub.sessions_per_period} séance{sub.sessions_per_period > 1 ? 's' : ''}/mois
                {' · '}Renouvellement le {new Date(sub.current_period_end).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white">Actif</div>
          </div>
          {sub.cancel_at_period_end ? (
            <p className="text-xs text-amber-600 font-medium">
              Annulation programmée — accès jusqu'au {new Date(sub.current_period_end).toLocaleDateString('fr-FR')}
            </p>
          ) : (
            <button
              onClick={() => handleCancel(sub.id)}
              disabled={cancelling === sub.id}
              className="text-xs text-muted hover:text-danger transition"
            >
              {cancelling === sub.id ? 'Annulation...' : 'Annuler l\'abonnement'}
            </button>
          )}
        </div>
      ))}

      {/* Credits */}
      {activeCredits.map(credit => {
        const remaining = credit.total_sessions - credit.used_sessions;
        const pct = Math.round((credit.used_sessions / credit.total_sessions) * 100);
        return (
          <div key={credit.id} className="rounded-2xl border border-border bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-text">{credit.coach_name}</p>
              <span className="text-xs font-semibold text-brand-500">{remaining} séance{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''}</span>
            </div>
            <div className="h-2 rounded-full bg-surface overflow-hidden">
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${100 - pct}%` }} />
            </div>
            {credit.expires_at && (
              <p className="mt-1 text-[10px] text-muted">Expire le {new Date(credit.expires_at).toLocaleDateString('fr-FR')}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

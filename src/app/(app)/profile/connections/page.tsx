'use client';

import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/pulse/app-header';
import { Button } from '@/components/pulse/button';
import { Badge } from '@/components/pulse/badge';
import { useToast } from '@/components/pulse/toast';

type ProviderCategory = 'tracking' | 'watches' | 'apps' | 'health';

type Provider = {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  category: ProviderCategory;
  ready: boolean; // true = OAuth wired, false = coming soon
};

const CATEGORIES: { key: ProviderCategory; label: string; emoji: string }[] = [
  { key: 'tracking', label: 'Apps de tracking', emoji: '📱' },
  { key: 'watches', label: 'Montres & Wearables', emoji: '⌚' },
  { key: 'apps', label: 'Apps sport & fitness', emoji: '🏋️' },
  { key: 'health', label: 'Sante & Bien-etre', emoji: '❤️' },
];

const PROVIDERS: Provider[] = [
  // ── Tracking ──
  { id: 'strava', name: 'Strava', icon: '🟠', description: 'Running, cycling, natation, triathlon', color: 'from-orange-500 to-orange-600', category: 'tracking', ready: true },
  { id: 'nike_run_club', name: 'Nike Run Club', icon: '✔️', description: 'Running, challenges Nike', color: 'from-black to-gray-800', category: 'tracking', ready: false },
  { id: 'adidas_running', name: 'adidas Running', icon: '🔵', description: 'Running, plans d\'entrainement', color: 'from-blue-700 to-blue-900', category: 'tracking', ready: false },
  { id: 'mapmyrun', name: 'MapMyRun', icon: '📍', description: 'Running avec GPS et parcours', color: 'from-red-500 to-red-700', category: 'tracking', ready: false },
  { id: 'runkeeper', name: 'Runkeeper', icon: '🏃', description: 'Running, marche, velo', color: 'from-blue-500 to-blue-600', category: 'tracking', ready: false },
  { id: 'komoot', name: 'Komoot', icon: '🗺️', description: 'Trail, rando, velo, parcours', color: 'from-green-700 to-emerald-600', category: 'tracking', ready: false },

  // ── Watches ──
  { id: 'garmin', name: 'Garmin Connect', icon: '⌚', description: 'Montres Garmin, GPS, métriques avancées', color: 'from-blue-600 to-cyan-600', category: 'watches', ready: true },
  { id: 'fitbit', name: 'Fitbit', icon: '💚', description: 'Activité, sommeil, fréquence cardiaque', color: 'from-teal-500 to-emerald-500', category: 'watches', ready: true },
  { id: 'apple_health', name: 'Apple Santé', icon: '🍎', description: 'Nécessite l\'app native (bientôt)', color: 'from-pink-500 to-red-500', category: 'watches', ready: false },
  { id: 'samsung_health', name: 'Samsung Health', icon: '💙', description: 'Galaxy Watch, métriques santé', color: 'from-blue-500 to-indigo-600', category: 'watches', ready: false },
  { id: 'polar', name: 'Polar Flow', icon: '❄️', description: 'Montres Polar, FC, récupération', color: 'from-red-600 to-red-700', category: 'watches', ready: true },
  { id: 'suunto', name: 'Suunto', icon: '🧭', description: 'Montres outdoor, trail, plongée', color: 'from-gray-800 to-gray-900', category: 'watches', ready: false },
  { id: 'coros', name: 'COROS', icon: '⚡', description: 'Montres GPS, triathlon, trail', color: 'from-orange-600 to-red-600', category: 'watches', ready: false },
  { id: 'whoop', name: 'WHOOP', icon: '🟢', description: 'Récupération, strain, sommeil', color: 'from-green-600 to-teal-700', category: 'watches', ready: true },
  { id: 'oura', name: 'Oura Ring', icon: '💍', description: 'Sommeil, readiness, température', color: 'from-gray-700 to-gray-800', category: 'watches', ready: true },

  // ── Apps sport ──
  { id: 'strong', name: 'Strong', icon: '💪', description: 'Musculation, suivi des charges', color: 'from-blue-600 to-indigo-700', category: 'apps', ready: false },
  { id: 'hevy', name: 'Hevy', icon: '🏋️', description: 'Musculation, programmes, PRs', color: 'from-indigo-500 to-purple-600', category: 'apps', ready: false },
  { id: 'freeletics', name: 'Freeletics', icon: '🔥', description: 'HIIT, bodyweight, coaching IA', color: 'from-gray-900 to-black', category: 'apps', ready: false },
  { id: 'gymshark', name: 'Gymshark Training', icon: '🦈', description: 'Programmes musculation', color: 'from-blue-800 to-blue-900', category: 'apps', ready: false },
  { id: 'peloton', name: 'Peloton', icon: '🚴', description: 'Velo, running, yoga, force', color: 'from-red-600 to-red-700', category: 'apps', ready: false },
  { id: 'zwift', name: 'Zwift', icon: '🌐', description: 'Cyclisme et running virtuel', color: 'from-orange-500 to-orange-700', category: 'apps', ready: false },
  { id: 'trainingpeaks', name: 'TrainingPeaks', icon: '📊', description: 'Plans d\'entrainement, TSS, CTL', color: 'from-gray-700 to-gray-800', category: 'apps', ready: false },
  { id: 'intervals_icu', name: 'intervals.icu', icon: '📈', description: 'Analytics cyclisme/triathlon', color: 'from-indigo-600 to-blue-700', category: 'apps', ready: false },
  { id: 'google_fit', name: 'Google Fit', icon: '🟩', description: 'Nécessite l\'app native (bientôt)', color: 'from-green-500 to-blue-500', category: 'apps', ready: false },

  // ── Sante ──
  { id: 'myfitnesspal', name: 'MyFitnessPal', icon: '🥗', description: 'Nutrition, calories, macros', color: 'from-blue-500 to-blue-600', category: 'health', ready: false },
  { id: 'yazio', name: 'YAZIO', icon: '🍎', description: 'Compteur calories, plans repas', color: 'from-green-500 to-green-600', category: 'health', ready: false },
  { id: 'fatsecret', name: 'FatSecret', icon: '🍽️', description: 'Suivi alimentaire, recettes', color: 'from-orange-500 to-yellow-500', category: 'health', ready: false },
  { id: 'cronometer', name: 'Cronometer', icon: '📋', description: 'Micronutriments, vitamines detaillees', color: 'from-orange-600 to-orange-700', category: 'health', ready: false },
  { id: 'sleep_cycle', name: 'Sleep Cycle', icon: '😴', description: 'Analyse du sommeil, reveil intelligent', color: 'from-indigo-500 to-purple-600', category: 'health', ready: false },
  { id: 'headspace', name: 'Headspace', icon: '🧘', description: 'Meditation, pleine conscience', color: 'from-orange-400 to-orange-500', category: 'health', ready: false },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function ConnectionsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/connectors')
      .then(r => r.ok ? r.json() : { connections: [] })
      .then(d => setConnections(d.connections || []))
      .finally(() => setLoading(false));
  }, []);

  const isConnected = (provider: string) =>
    connections.some((c: any) => c.provider === provider && c.is_active);

  const getConnection = (provider: string) =>
    connections.find((c: any) => c.provider === provider && c.is_active);

  const OAUTH_PROVIDERS = ['strava', 'garmin', 'fitbit', 'polar', 'whoop', 'oura'];

  const handleConnect = (provider: string) => {
    if (OAUTH_PROVIDERS.includes(provider)) {
      window.location.href = `/api/connectors/${provider}/connect`;
    } else {
      toast('info', 'Bientôt disponible', `L'intégration ${provider} arrive prochainement.`);
    }
  };

  const handleDisconnect = async (provider: string) => {
    await fetch(`/api/connectors/${provider}/disconnect`, { method: 'POST' });
    setConnections(prev => prev.filter((c: any) => !(c.provider === provider && c.is_active)));
    toast('success', 'Deconnecte', `${provider} a ete deconnecte.`);
  };

  const handleSync = async (provider: string) => {
    setSyncing(provider);
    try {
      const res = await fetch(`/api/connectors/${provider}/sync`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast('success', 'Synchronise', `${data.synced} activites importees depuis ${provider}.`);
      } else {
        toast('error', 'Erreur de sync', data.error || 'Reessayez plus tard.');
      }
    } catch {
      toast('error', 'Erreur', 'Impossible de synchroniser.');
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return (
      <>
        <AppHeader title="Connexions" />
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Connexions" />
      <div className="p-4 md:p-8 max-w-2xl">
        <h1 className="hidden md:block text-2xl font-extrabold text-text mb-2">Connexions</h1>
        <p className="text-sm text-muted mb-6">Connectez vos apps sportives pour importer vos activites automatiquement.</p>

        {CATEGORIES.map(cat => {
          const catProviders = PROVIDERS.filter(p => p.category === cat.key);
          return (
            <div key={cat.key} className="mb-8">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-text">
                <span>{cat.emoji}</span> {cat.label}
                <span className="text-xs font-normal text-muted">({catProviders.length})</span>
              </h2>
              <div className="space-y-3">
                {catProviders.map(p => {
                  const connected = isConnected(p.id);
                  const conn = getConnection(p.id);
                  return (
                    <div key={p.id} className="overflow-hidden rounded-2xl border border-border bg-white">
                      <div className={`bg-gradient-to-r ${p.color} px-4 py-3 text-white flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{p.icon}</span>
                          <div>
                            <p className="text-sm font-bold">{p.name}</p>
                            <p className="text-[11px] opacity-75">{p.description}</p>
                          </div>
                        </div>
                        {connected && <Badge variant="verified">Connecte</Badge>}
                        {!connected && !p.ready && (
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">Bientot</span>
                        )}
                      </div>
                      <div className="px-4 py-3 flex items-center justify-between">
                        {connected ? (
                          <>
                            <div className="text-xs text-muted">
                              {conn?.last_sync_at && `Derniere sync: ${new Date(conn.last_sync_at).toLocaleDateString('fr-FR')}`}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="primary" loading={syncing === p.id} onClick={() => handleSync(p.id)}>
                                Sync
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDisconnect(p.id)}>
                                Retirer
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-muted">{p.ready ? 'Pret a connecter' : 'Integration en cours de developpement'}</p>
                            <Button
                              size="sm"
                              variant={p.ready ? 'dark' : 'secondary'}
                              disabled={!p.ready}
                              onClick={() => handleConnect(p.id)}
                            >
                              {p.ready ? 'Connecter' : 'Bientot'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppHeader } from '@/components/pulse/app-header';

interface CycleData {
  last_period_date: string;
  cycle_length: number;
  period_length: number;
}

export default function CycleTrackingPage() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lastPeriodDate, setLastPeriodDate] = useState('');
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/cycle-tracking');
        if (res.ok) {
          const data: CycleData = await res.json();
          if (data && data.last_period_date) {
            setEnabled(true);
            setLastPeriodDate(data.last_period_date);
            setCycleLength(data.cycle_length ?? 28);
            setPeriodLength(data.period_length ?? 5);
          }
        }
      } catch {
        // no data yet
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await fetch('/api/cycle-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          last_period_date: lastPeriodDate,
          cycle_length: cycleLength,
          period_length: periodLength,
        }),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch('/api/cycle-tracking', { method: 'DELETE' });
      setEnabled(false);
      setLastPeriodDate('');
      setCycleLength(28);
      setPeriodLength(5);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <>
        <AppHeader title="Suivi du cycle" />
        <div className="p-4 flex items-center justify-center min-h-[200px]">
          <p className="text-sm text-muted">Chargement...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Suivi du cycle" />
      <div className="p-4 md:p-8 max-w-lg space-y-5">
        <h1 className="hidden md:block text-2xl font-extrabold text-text">
          Suivi du cycle menstruel
        </h1>

        {/* Explanation card */}
        <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
          <p className="text-sm text-muted leading-relaxed">
            Le suivi du cycle menstruel permet d&apos;adapter l&apos;intensité de vos entraînements
            selon vos phases hormonales. Vos données sont privées et chiffrées.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-base">🔴</span>
              <span className="font-medium text-text">Règles</span>
              <span className="text-muted">— Intensité adaptée</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-base">🟢</span>
              <span className="font-medium text-text">Folliculaire</span>
              <span className="text-muted">— Fenêtre optimale pour pousser</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-base">🟡</span>
              <span className="font-medium text-text">Ovulation</span>
              <span className="text-muted">— Pic de puissance, attention ACL</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-base">🔵</span>
              <span className="font-medium text-text">Lutéale</span>
              <span className="text-muted">— Endurance à basse intensité</span>
            </div>
          </div>
        </div>

        {/* Toggle */}
        <div className="rounded-2xl border border-border bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text">Activer le suivi</p>
              <p className="text-xs text-muted mt-0.5">Personnalisez vos entraînements</p>
            </div>
            <button
              onClick={() => setEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                enabled ? 'bg-brand-600' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={enabled}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Form */}
        {enabled && (
          <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
            <Input
              label="Date des dernières règles"
              type="date"
              value={lastPeriodDate}
              onChange={(e) => setLastPeriodDate(e.target.value)}
              required
              max={new Date().toISOString().split('T')[0]}
            />
            <Input
              label="Durée moyenne du cycle (jours)"
              type="number"
              value={cycleLength}
              onChange={(e) => setCycleLength(Number(e.target.value))}
              min={21}
              max={40}
            />
            <Input
              label="Durée moyenne des règles (jours)"
              type="number"
              value={periodLength}
              onChange={(e) => setPeriodLength(Number(e.target.value))}
              min={2}
              max={8}
            />

            <Button
              variant="primary"
              className="w-full"
              onClick={handleSave}
              disabled={saving || !lastPeriodDate}
            >
              {saving ? 'Sauvegarde...' : success ? 'Sauvegardé ✓' : 'Sauvegarder'}
            </Button>

            <p className="text-xs text-muted text-center leading-relaxed">
              En activant cette fonctionnalité, vous consentez au traitement de ces données de santé
              conformément au RGPD.
            </p>

            <div className="pt-1 text-center">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Suppression...' : 'Supprimer mes données'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

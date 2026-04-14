'use client';

import type { BodyState } from '@/lib/training/body-state-engine';

interface InjuryAlertsProps {
  bodyState: BodyState;
}

// ── French name mapping ──
const FRENCH_NAMES: Record<string, string> = {
  achilles: "Tendon d'Achille",
  patellar: 'Tendon rotulien',
  it_band: 'Bandelette ilio-tibiale',
  rotator_cuff: 'Coiffe des rotateurs',
  plantar_fascia: 'Fascia plantaire',
  biceps_tendon: 'Tendon du biceps',
  pec_tendon: 'Tendon pectoral',
  knees: 'Genoux',
  ankles: 'Chevilles',
  hips: 'Hanches',
  shoulders: 'Épaules',
  elbows: 'Coudes',
  wrists: 'Poignets',
  lumbar_spine: 'Colonne lombaire',
};

interface Alert {
  name: string;
  type: 'tendon' | 'joint';
  stressPercent: number;
  alertLevel: 'warning' | 'danger';
}

function getRecommendation(alert: Alert): string {
  if (alert.alertLevel === 'danger') {
    if (alert.type === 'tendon') return 'Repos actif conseillé';
    return 'Repos complet recommandé';
  }
  if (alert.type === 'tendon') return 'Étirements recommandés';
  if (['knees', 'ankles', 'hips'].includes(alert.name))
    return 'Réduire le volume course';
  return 'Réduire le volume';
}

export function InjuryAlerts({ bodyState }: InjuryAlertsProps) {
  const alerts: Alert[] = [];

  for (const [name, state] of Object.entries(bodyState.tendonRegions)) {
    if (state.alertLevel !== 'normal') {
      alerts.push({
        name,
        type: 'tendon',
        stressPercent: state.stressPercent,
        alertLevel: state.alertLevel,
      });
    }
  }

  for (const [name, state] of Object.entries(bodyState.jointRegions)) {
    if (state.alertLevel !== 'normal') {
      alerts.push({
        name,
        type: 'joint',
        stressPercent: state.impactPercent,
        alertLevel: state.alertLevel,
      });
    }
  }

  if (alerts.length === 0) return null;

  const sorted = [...alerts].sort((a, b) =>
    a.alertLevel === 'danger' && b.alertLevel !== 'danger' ? -1 : 1
  );

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">
        Alertes prévention
      </h3>
      <div className="space-y-2">
        {sorted.map((item) => {
          const isDanger = item.alertLevel === 'danger';
          return (
            <div
              key={item.name}
              className={`flex items-start gap-3 rounded-xl p-3 ${
                isDanger
                  ? 'bg-red-950/40 border border-red-900/50'
                  : 'bg-amber-950/30 border border-amber-900/40'
              }`}
            >
              <span className="mt-0.5 text-lg" aria-hidden>
                {isDanger ? '🔴' : '⚠️'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`text-sm font-medium ${
                      isDanger ? 'text-red-300' : 'text-amber-300'
                    }`}
                  >
                    {FRENCH_NAMES[item.name] ?? item.name}
                  </span>
                  <span
                    className={`text-xs font-mono ${
                      isDanger ? 'text-red-400' : 'text-amber-400'
                    }`}
                  >
                    {Math.round(item.stressPercent)}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {getRecommendation(item)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

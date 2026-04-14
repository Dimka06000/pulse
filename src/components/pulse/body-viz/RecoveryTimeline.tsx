'use client';

import type { BodyState } from '@/lib/training/body-state-engine';

interface RecoveryTimelineProps {
  bodyState: BodyState;
}

const ZONES = [
  { label: 'Surentraîné', color: '#ef4444', from: 0, to: 25 },
  { label: 'Fatigué', color: '#f97316', from: 25, to: 50 },
  { label: 'En récupération', color: '#eab308', from: 50, to: 75 },
  { label: 'Prêt', color: '#22c55e', from: 75, to: 100 },
] as const;

export function RecoveryTimeline({ bodyState }: RecoveryTimelineProps) {
  const readiness = bodyState.readinessScore;
  const hoursLeft = bodyState.recoveryTimeEstimate;
  const currentZone =
    ZONES.find((z) => readiness >= z.from && readiness < z.to) ?? ZONES[3];

  return (
    <div className="w-full space-y-2 px-1">
      {/* Timeline bar */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-800">
        {/* Zone backgrounds */}
        {ZONES.map((z) => (
          <div
            key={z.label}
            className="absolute top-0 h-full"
            style={{
              left: `${z.from}%`,
              width: `${z.to - z.from}%`,
              backgroundColor: z.color,
              opacity: 0.25,
            }}
          />
        ))}

        {/* Current position indicator */}
        <div
          className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg"
          style={{
            left: `${readiness}%`,
            backgroundColor: currentZone.color,
            boxShadow: `0 0 8px ${currentZone.color}`,
            transition: 'left 0.6s ease-out',
          }}
        />
      </div>

      {/* Zone labels */}
      <div className="flex justify-between text-[10px] text-gray-500">
        {ZONES.map((z) => (
          <span
            key={z.label}
            className={
              z.label === currentZone.label
                ? 'font-semibold text-white'
                : ''
            }
          >
            {z.label}
          </span>
        ))}
      </div>

      {/* Recovery estimate */}
      <p className="text-center text-xs text-gray-400">
        {readiness >= 75 ? (
          <span className="font-medium text-green-400">
            Prêt à s&apos;entraîner !
          </span>
        ) : (
          <>
            Récupération estimée :{' '}
            <span className="font-medium text-white">
              ~{Math.round(hoursLeft)}h
            </span>
          </>
        )}
      </p>
    </div>
  );
}

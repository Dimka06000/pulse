'use client';

import { OVERALL_STATE_FR } from './body-paths';
import type { BodyState } from '@/lib/training/body-state-engine';

interface ReadinessScoreProps {
  bodyState: BodyState;
  compact?: boolean;
  onClick?: () => void;
}

function scoreColor(score: number): string {
  if (score < 30) return '#ef4444';
  if (score < 60) return '#f59e0b';
  return '#22c55e';
}

export function ReadinessScore({ bodyState, compact, onClick }: ReadinessScoreProps) {
  const { readinessScore, overallState, recoveryTimeEstimate } = bodyState;
  const color = scoreColor(readinessScore);
  const size = compact ? 80 : 120;
  const strokeWidth = compact ? 6 : 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (readinessScore / 100) * circumference;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-gray-200 bg-white p-4 ${compact ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${compact ? 'flex items-center gap-4' : 'flex flex-col items-center gap-3'}`}
    >
      {/* Circular ring */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Score number centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`font-extrabold ${compact ? 'text-xl' : 'text-3xl'}`}
            style={{ color }}
          >
            {readinessScore}
          </span>
        </div>
      </div>

      {/* Text info */}
      <div className={compact ? 'flex-1 min-w-0' : 'text-center'}>
        <p className={`font-bold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
          Score de préparation
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {OVERALL_STATE_FR[overallState] || overallState}
        </p>
        {recoveryTimeEstimate > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">
            ~{recoveryTimeEstimate}h de récupération estimée
          </p>
        )}
      </div>
    </div>
  );
}

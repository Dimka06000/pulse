'use client';

import { MetricArrow } from './metric-arrow';

interface ProgressSummaryProps {
  weightTrend?: {
    direction: 'up' | 'down' | 'stable';
    sentence: string;
  };
  frequencyTrend?: {
    direction: 'up' | 'down' | 'stable';
    sentence: string;
  };
  performanceTrend?: {
    direction: 'up' | 'down' | 'stable';
    sentence: string;
  };
}

export function ProgressSummary({ weightTrend, frequencyTrend, performanceTrend }: ProgressSummaryProps) {
  const trends = [
    weightTrend && { ...weightTrend, label: 'Poids', positiveDirection: 'down' as const },
    frequencyTrend && { ...frequencyTrend, label: 'Régularité', positiveDirection: 'up' as const },
    performanceTrend && { ...performanceTrend, label: 'Performance', positiveDirection: 'up' as const },
  ].filter(Boolean);

  if (trends.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center text-gray-400">
        Pas encore de données de progression
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {trends.map((trend) => (
        <div key={trend!.label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">{trend!.label}</span>
            <MetricArrow direction={trend!.direction} positiveDirection={trend!.positiveDirection} />
          </div>
          <p className="text-base font-medium text-gray-900">{trend!.sentence}</p>
        </div>
      ))}
    </div>
  );
}

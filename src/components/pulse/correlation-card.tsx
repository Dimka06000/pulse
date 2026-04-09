'use client';

import type { Correlation } from '@/lib/intelligence/engine';

export function CorrelationCard({ correlation }: { correlation: Correlation }) {
  const { factorLabel, metricLabel, withFactor, withoutFactor, deltaPercent, direction, sentence } = correlation;

  const maxVal = Math.max(withFactor, withoutFactor);
  const withPct = maxVal > 0 ? (withFactor / maxVal) * 100 : 0;
  const withoutPct = maxVal > 0 ? (withoutFactor / maxVal) * 100 : 0;

  const isPositive = direction === 'positive';

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      {/* Labels */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-muted">{factorLabel}</p>
          <p className="text-[11px] text-muted/60">→ {metricLabel}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            isPositive
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-red-50 text-red-500'
          }`}
        >
          {isPositive ? '+' : '-'}{deltaPercent}%
        </span>
      </div>

      {/* Bars */}
      <div className="space-y-2 mb-3">
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-muted">Avec</span>
            <span className="text-[10px] font-semibold text-text">{withFactor}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface overflow-hidden">
            <div
              className={`h-full rounded-full ${isPositive ? 'bg-emerald-400' : 'bg-red-400'}`}
              style={{ width: `${withPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-muted">Sans</span>
            <span className="text-[10px] font-semibold text-text">{withoutFactor}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-300"
              style={{ width: `${withoutPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sentence */}
      <p className="text-xs text-text/70 leading-relaxed">{sentence}</p>
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';

interface LoadChartProps {
  history: { date: string; ctl: number; atl: number; tsb: number }[];
  blocks?: { phase: string; weekStart: number; weekEnd: number }[];
  totalWeeks: number;
  // Optional per-discipline histories for multi-sport view
  disciplineHistories?: Partial<Record<string, { date: string; ctl: number; atl: number; tsb: number }[]>>;
  sport?: string;
}

const PHASE_BG: Record<string, string> = {
  base: '#DBEAFE',
  build: '#FEF3C7',
  peak: '#FEE2E2',
  taper: '#D1FAE5',
  race: '#FEF9C3',
  recovery: '#EDE9FE',
};

const DISCIPLINE_LINE_COLORS: Record<string, string> = {
  swim: '#0EA5E9',  // sky-500
  bike: '#10B981',  // emerald-500
  run: '#F97316',   // orange-500
};

const DISCIPLINE_LABELS: Record<string, string> = {
  swim: '🏊 Natation',
  bike: '🚴 Vélo',
  run: '🏃 Course',
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const date = label as string;
  const d = new Date(date);
  const formatted = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getFullYear()}`;

  const labelMap: Record<string, string> = {
    ctl: 'Fitness',
    atl: 'Fatigue',
    tsb: 'Forme',
    swim_ctl: '🏊 Fitness',
    bike_ctl: '🚴 Fitness',
    run_ctl: '🏃 Fitness',
  };

  return (
    <div className="rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg">
      <p className="font-medium mb-1">{formatted}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {labelMap[p.dataKey] ?? p.dataKey}: {Math.round(p.value)}
        </p>
      ))}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function LoadChart({ history, blocks, totalWeeks, disciplineHistories, sport }: LoadChartProps) {
  const isMultiSport = sport === 'triathlon' || sport === 'duathlon';
  const [viewMode, setViewMode] = useState<'combined' | 'per_discipline'>('combined');

  if (!history || history.length === 0) return null;

  const startDate = new Date(history[0].date);

  const data = history.map((entry) => {
    const d = new Date(entry.date);
    const daysDiff = Math.floor(
      (d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const weekNum = Math.floor(daysDiff / 7) + 1;
    return {
      ...entry,
      label: `S${weekNum}`,
      formatted: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, '0')}`,
    };
  });

  // For per-discipline view, merge discipline CTL into combined data
  const perDiscData = (() => {
    if (!isMultiSport || !disciplineHistories || viewMode !== 'per_discipline') return data;

    // Build a map from date → discipline CTL values
    const discs = Object.keys(disciplineHistories) as string[];
    const discMaps = discs.reduce((acc, disc) => {
      const entries = disciplineHistories[disc] ?? [];
      acc[disc] = new Map(entries.map((e) => [e.date, e.ctl]));
      return acc;
    }, {} as Record<string, Map<string, number>>);

    return data.map((entry) => {
      const enriched: Record<string, unknown> = { ...entry };
      for (const disc of discs) {
        enriched[`${disc}_ctl`] = discMaps[disc]?.get(entry.date) ?? 0;
      }
      return enriched;
    });
  })();

  // Show one tick per week
  const ticks = data.filter((_, i) => i % 7 === 0).map((d) => d.date);

  const minTsb = Math.min(...data.map((d) => d.tsb));
  const maxTsb = Math.max(...data.map((d) => d.tsb));

  const phaseAreas =
    blocks && blocks.length > 0
      ? blocks.map((block, idx) => {
          const blockStartDayOffset = (block.weekStart - 1) * 7;
          const blockEndDayOffset = block.weekEnd * 7 - 1;
          const blockStartDate = new Date(
            startDate.getTime() + blockStartDayOffset * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .slice(0, 10);
          const blockEndDate = new Date(
            startDate.getTime() + blockEndDayOffset * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .slice(0, 10);

          return (
            <ReferenceArea
              key={`phase-${idx}`}
              x1={blockStartDate}
              x2={blockEndDate}
              fill={PHASE_BG[block.phase] || '#F3F4F6'}
              fillOpacity={0.4}
              ifOverflow="extendDomain"
            />
          );
        })
      : null;

  const disciplines = isMultiSport && disciplineHistories
    ? Object.keys(disciplineHistories).filter((d) => (disciplineHistories[d]?.length ?? 0) > 0)
    : [];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 mb-4">
      {/* Title + toggle */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-gray-900">
          Charge d&apos;entraînement
        </h3>
        {isMultiSport && (
          <div className="flex gap-1">
            {(['combined', 'per_discipline'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {mode === 'combined' ? 'Combiné' : 'Par discipline'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={250}>
        <LineChart
          data={viewMode === 'per_discipline' && isMultiSport ? perDiscData : data}
          margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />

          {phaseAreas}

          {/* Danger zone: TSB < -20 (combined view only) */}
          {viewMode === 'combined' && minTsb < -20 && (
            <ReferenceArea
              y1={-20}
              y2={Math.min(minTsb, -20) - 5}
              fill="#FEE2E2"
              fillOpacity={0.5}
            />
          )}

          {/* Peak zone: TSB > 15 (combined view only) */}
          {viewMode === 'combined' && maxTsb > 15 && (
            <ReferenceArea
              y1={15}
              y2={Math.max(maxTsb, 15) + 5}
              fill="#D1FAE5"
              fillOpacity={0.5}
            />
          )}

          <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="4 4" />

          <XAxis
            dataKey="date"
            ticks={ticks}
            tickFormatter={(date: string) => {
              const d = new Date(date);
              const daysDiff = Math.floor(
                (d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              return `S${Math.floor(daysDiff / 7) + 1}`;
            }}
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />

          {viewMode === 'combined' || !isMultiSport ? (
            <>
              {/* CTL — Fitness (blue, thick) */}
              <Line
                type="monotone"
                dataKey="ctl"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={false}
                name="ctl"
              />
              {/* ATL — Fatigue (red, dashed) */}
              <Line
                type="monotone"
                dataKey="atl"
                stroke="#EF4444"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                name="atl"
              />
              {/* TSB — Forme (green) */}
              <Line
                type="monotone"
                dataKey="tsb"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                name="tsb"
              />
            </>
          ) : (
            <>
              {/* Per-discipline CTL lines */}
              {disciplines.map((disc) => (
                <Line
                  key={disc}
                  type="monotone"
                  dataKey={`${disc}_ctl`}
                  stroke={DISCIPLINE_LINE_COLORS[disc] ?? '#6B7280'}
                  strokeWidth={2.5}
                  dot={false}
                  name={`${disc}_ctl`}
                />
              ))}
              {/* Combined CTL dashed */}
              <Line
                type="monotone"
                dataKey="ctl"
                stroke="#3B82F6"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                name="ctl"
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      {(viewMode === 'combined' || !isMultiSport) ? (
        <div className="flex items-center justify-center gap-5 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
            Fitness (CTL)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
            Fatigue (ATL)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Forme (TSB)
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs text-gray-500">
          {disciplines.map((disc) => (
            <span key={disc} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: DISCIPLINE_LINE_COLORS[disc] ?? '#6B7280' }}
              />
              {DISCIPLINE_LABELS[disc] ?? disc} CTL
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500 opacity-60" />
            Combiné CTL
          </span>
        </div>
      )}
    </div>
  );
}

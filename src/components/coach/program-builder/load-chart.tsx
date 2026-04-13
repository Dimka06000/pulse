'use client';

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
}

const PHASE_BG: Record<string, string> = {
  base: '#DBEAFE',     // light blue
  build: '#FEF3C7',    // light amber
  peak: '#FEE2E2',     // light red
  taper: '#D1FAE5',    // light green
  race: '#FEF9C3',     // light yellow
  recovery: '#EDE9FE', // light violet
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const date = label as string;
  const d = new Date(date);
  const formatted = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getFullYear()}`;

  return (
    <div className="rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg">
      <p className="font-medium mb-1">{formatted}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey === 'ctl' ? 'Fitness' : p.dataKey === 'atl' ? 'Fatigue' : 'Forme'}:{' '}
          {Math.round(p.value)}
        </p>
      ))}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function LoadChart({ history, blocks, totalWeeks }: LoadChartProps) {
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

  // Show one tick per week
  const ticks = data.filter((_, i) => i % 7 === 0).map((d) => d.date);

  const minTsb = Math.min(...data.map((d) => d.tsb));
  const maxTsb = Math.max(...data.map((d) => d.tsb));

  // Build phase reference areas based on date index
  const phaseAreas =
    blocks && blocks.length > 0
      ? blocks.map((block, idx) => {
          // Convert week numbers to dates
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

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 mb-4">
      {/* Title */}
      <h3 className="font-bold text-sm text-gray-900 mb-3">
        Charge d&apos;entraînement
      </h3>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />

          {/* Phase background bands */}
          {phaseAreas}

          {/* Danger zone: TSB < -20 */}
          {minTsb < -20 && (
            <ReferenceArea
              y1={-20}
              y2={Math.min(minTsb, -20) - 5}
              fill="#FEE2E2"
              fillOpacity={0.5}
            />
          )}

          {/* Peak zone: TSB > 15 */}
          {maxTsb > 15 && (
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
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
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
    </div>
  );
}

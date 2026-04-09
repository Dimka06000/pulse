'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatDateFr } from '@/lib/format';

interface ProgressChartProps {
  data: Array<{ date: string; value: number }>;
  label: string;       // "Poids (kg)", "Performance"
  color?: string;
  unit?: string;       // "kg", "reps"
}

export function ProgressChart({ data, label, color = '#10b981', unit = '' }: ProgressChartProps) {
  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-8 text-center text-gray-400">
        Pas assez de données pour afficher la courbe
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: formatDateFr(d.date),
    value: d.value,
  }));

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-medium text-gray-500">{label}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip
            formatter={(value: number) => [`${value} ${unit}`, label]}
            labelStyle={{ color: '#6b7280', fontSize: 12 }}
            contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

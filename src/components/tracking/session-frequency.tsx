'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface SessionFrequencyProps {
  dates: string[];   // All completed session dates
}

export function SessionFrequency({ dates }: SessionFrequencyProps) {
  // Group by week (last 12 weeks)
  const now = new Date();
  const weeks: Array<{ label: string; count: number }> = [];

  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const count = dates.filter((d) => {
      const dt = new Date(d);
      return dt >= weekStart && dt <= weekEnd;
    }).length;

    const label = `S${52 - i}`;
    weeks.push({ label, count });
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-medium text-gray-500">Séances par semaine</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={weeks}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            formatter={(value: number) => [`${value} séance${value > 1 ? 's' : ''}`, 'Fréquence']}
            contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }}
          />
          <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

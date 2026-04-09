'use client';

import { useState, useEffect, use } from 'react';
import { ProgressSummary } from '@/components/tracking/progress-summary';
import { ProgressChart } from '@/components/tracking/progress-chart';
import { SessionFrequency } from '@/components/tracking/session-frequency';
import { timeAgoFr } from '@/lib/format';

interface ProgressData {
  clientId: string;
  clientName: string;
  avatarUrl?: string;
  totalSessions: number;
  lastSessionDate?: string;
  weightData: Array<{ date: string; value: number }>;
  performanceData: Array<{ date: string; value: number }>;
  sessionDates: string[];
  weightTrend: { direction: 'up' | 'down' | 'stable'; sentence: string } | null;
  frequencyTrend: { direction: 'up' | 'down' | 'stable'; sentence: string };
  performanceTrend: { direction: 'up' | 'down' | 'stable'; sentence: string };
  recentNotes: string[];
}

export default function ClientProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clients/${id}/progress`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-400">Client introuvable</div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-600">
          {data.clientName.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.clientName}</h1>
          <p className="text-sm text-gray-400">
            {data.totalSessions} séance{data.totalSessions > 1 ? 's' : ''}
            {data.lastSessionDate && ` \u00B7 Dernière : ${timeAgoFr(data.lastSessionDate)}`}
          </p>
        </div>
      </div>

      {/* Progress summary — human language */}
      <ProgressSummary
        weightTrend={data.weightTrend || undefined}
        frequencyTrend={data.frequencyTrend}
        performanceTrend={data.performanceTrend}
      />

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProgressChart
          data={data.weightData}
          label="Poids (kg)"
          color="#6366f1"
          unit="kg"
        />
        <ProgressChart
          data={data.performanceData}
          label="Performance"
          color="#10b981"
          unit="pts"
        />
      </div>

      {/* Session frequency */}
      <SessionFrequency dates={data.sessionDates} />

      {/* Recent notes */}
      {data.recentNotes.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-medium text-gray-500">Notes récentes</h3>
          <div className="space-y-3">
            {data.recentNotes.map((note, i) => (
              <div key={i} className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm text-gray-700">{note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

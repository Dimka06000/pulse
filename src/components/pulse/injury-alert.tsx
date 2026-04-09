'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { InjuryRisk } from '@/lib/intelligence/engine';

export function InjuryAlert() {
  const [risk, setRisk] = useState<InjuryRisk | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/intelligence/injury-risk')
      .then(r => r.ok ? r.json() : null)
      .then(setRisk)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !risk || risk.level === 'low') return null;

  const isHigh = risk.level === 'high';

  return (
    <div
      className={`rounded-2xl border-2 p-4 ${
        isHigh
          ? 'border-red-300 bg-gradient-to-r from-red-50 to-red-100/50'
          : 'border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{isHigh ? '🚨' : '⚠️'}</span>
        <div className="flex-1">
          <p className={`text-sm font-bold ${isHigh ? 'text-red-700' : 'text-amber-700'}`}>
            {isHigh ? 'Risque de blessure élevé' : 'Attention — signaux de surcharge'}
          </p>
          <p className={`mt-1 text-sm ${isHigh ? 'text-red-600' : 'text-amber-600'}`}>
            {risk.message}
          </p>

          {risk.factors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {risk.factors.map((f, i) => (
                <li
                  key={i}
                  className={`text-xs ${isHigh ? 'text-red-500' : 'text-amber-500'}`}
                >
                  • {f}
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/journal"
            className={`mt-3 inline-block text-xs font-semibold underline ${
              isHigh ? 'text-red-600' : 'text-amber-600'
            }`}
          >
            En savoir plus →
          </Link>
        </div>
      </div>
    </div>
  );
}

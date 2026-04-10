'use client';

interface MacroRingProps {
  protein: number;  // grams
  carbs: number;
  fat: number;
  dailyCalories: number;
}

export function MacroRing({ protein, carbs, fat, dailyCalories }: MacroRingProps) {
  const total = protein * 4 + carbs * 4 + fat * 9;
  const pPct = total > 0 ? (protein * 4) / total : 0;
  const cPct = total > 0 ? (carbs * 4) / total : 0;
  const fPct = total > 0 ? (fat * 9) / total : 0;

  // SVG donut
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { pct: pPct, color: '#6366f1', label: 'Protéines', grams: protein },
    { pct: cPct, color: '#f59e0b', label: 'Glucides', grams: carbs },
    { pct: fPct, color: '#10b981', label: 'Lipides', grams: fat },
  ];

  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 140 140">
          {segments.map((seg, i) => {
            const dashArray = `${seg.pct * circumference} ${circumference}`;
            const dashOffset = -offset * circumference;
            offset += seg.pct;
            return (
              <circle
                key={i}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="14"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 70 70)"
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{dailyCalories}</span>
          <span className="text-xs text-gray-400">kcal/jour</span>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-sm text-gray-600">
              {seg.label} : {seg.grams} g ({Math.round(seg.pct * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

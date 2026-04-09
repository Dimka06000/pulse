'use client';

interface EventSlotsBadgeProps {
  filled: number;
  total: number;
  label: string; // "Coachs" or "Sportifs"
}

export function EventSlotsBadge({ filled, total, label }: EventSlotsBadgeProps) {
  const pct = total > 0 ? Math.min((filled / total) * 100, 100) : 0;
  const isFull = filled >= total;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600">{label}</span>
          <span className={isFull ? 'text-red-600 font-medium' : 'text-gray-900'}>
            {filled}/{total}
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isFull ? 'bg-red-500' : pct >= 75 ? 'bg-orange-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

'use client';

interface StreakBadgeProps {
  current: number;
  longest: number;
}

function StreakBadge({ current, longest }: StreakBadgeProps) {
  if (current === 0 && longest === 0) return null;

  return (
    <div className="inline-flex flex-col items-center">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1.5 text-white shadow-sm">
        <span className="text-sm" role="img" aria-label="fire">
          🔥
        </span>
        <span className="text-sm font-bold">
          {current} jour{current > 1 ? 's' : ''}
        </span>
      </div>
      {longest > 0 && (
        <span className="mt-1 text-[10px] text-muted">
          Record : {longest} jour{longest > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

export { StreakBadge, type StreakBadgeProps };

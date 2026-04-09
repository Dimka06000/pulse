interface RatingStatsProps {
  avgRating: number;
  totalRatings: number;
  distribution: Record<number, number>;
}

export function RatingStats({ avgRating, totalRatings, distribution }: RatingStatsProps) {
  return (
    <div className="flex gap-6 rounded-xl bg-gray-50 p-4">
      {/* Average */}
      <div className="text-center">
        <p className="text-3xl font-bold text-gray-900">{avgRating.toFixed(1)}</p>
        <div className="mt-1 flex justify-center text-yellow-400">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={star <= Math.round(avgRating) ? 'text-yellow-400' : 'text-gray-200'}
            >
              &#9733;
            </span>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">{totalRatings} avis</p>
      </div>

      {/* Distribution bars */}
      <div className="flex-1 space-y-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] ?? 0;
          const pct = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-sm">
              <span className="w-3 text-gray-500">{star}</span>
              <div className="flex-1 rounded-full bg-gray-200 h-2">
                <div
                  className="h-2 rounded-full bg-yellow-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs text-gray-400">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

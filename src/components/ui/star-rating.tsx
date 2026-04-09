interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

export function StarRating({
  rating,
  maxStars = 5,
  size = 'md',
  showValue = false,
}: StarRatingProps) {
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' };
  const rounded = Math.round(rating * 2) / 2;

  return (
    <div className={`flex items-center gap-1 ${sizes[size]}`}>
      {Array.from({ length: maxStars }, (_, i) => {
        const filled = i + 1 <= rounded;
        const half = i + 0.5 === rounded;
        return (
          <span key={i} className={filled || half ? 'text-amber-400' : 'text-gray-300'}>
            {filled ? '★' : half ? '★' : '☆'}
          </span>
        );
      })}
      {showValue && (
        <span className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}

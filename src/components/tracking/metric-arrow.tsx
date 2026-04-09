'use client';

interface MetricArrowProps {
  direction: 'up' | 'down' | 'stable';
  /** For weight: down = good (green). For performance: up = good (green). */
  positiveDirection?: 'up' | 'down';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Visual trend indicator. Color logic:
 * - If positiveDirection matches direction -> green
 * - If opposite -> red
 * - If stable -> orange
 */
export function MetricArrow({ direction, positiveDirection = 'up', size = 'md' }: MetricArrowProps) {
  const sizeMap = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' };

  if (direction === 'stable') {
    return <span className={`${sizeMap[size]} text-orange-500`}>&rarr;</span>;
  }

  const isGood = direction === positiveDirection;
  const color = isGood ? 'text-emerald-500' : 'text-red-500';
  const arrow = direction === 'up' ? '\u2191' : '\u2193';

  return <span className={`${sizeMap[size]} ${color} font-bold`}>{arrow}</span>;
}

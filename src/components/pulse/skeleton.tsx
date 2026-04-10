/**
 * Reusable skeleton loader component.
 * Renders an animated pulse block as a loading placeholder.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-surface ${className || ''}`} />;
}

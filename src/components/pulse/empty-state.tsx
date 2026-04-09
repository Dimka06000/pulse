"use client";

import { Button } from "./button";

type EmptyStateProps = {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-border bg-gradient-to-b from-surface to-white px-6 py-12 text-center">
      <div className="absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/5" />
      <div className="relative">
        <div className="text-5xl">{icon}</div>
        <h3 className="mt-4 text-lg font-bold text-text">{title}</h3>
        <p className="mt-1 text-sm text-muted">{description}</p>
        {actionLabel && onAction && (
          <div className="mt-6">
            <Button onClick={onAction}>{actionLabel}</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export { EmptyState };

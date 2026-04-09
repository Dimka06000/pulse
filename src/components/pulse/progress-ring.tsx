"use client";

import { type ReactNode } from "react";

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: ReactNode;
}

export function ProgressRing({
  percent,
  size = 80,
  strokeWidth = 3,
  className = "",
  children,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 36 36" className="-rotate-90" width={size} height={size}>
        <defs>
          <linearGradient id="pulse-ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle
          className="stroke-border"
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          strokeWidth={strokeWidth}
        />

        {/* Progress arc */}
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          stroke="url(#pulse-ring-gradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${clamped}, 100`}
          strokeLinecap="round"
        />
      </svg>

      {/* Centered content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children ?? (
          <span className="font-mono text-lg font-bold">{clamped}%</span>
        )}
      </div>
    </div>
  );
}

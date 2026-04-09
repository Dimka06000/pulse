"use client";

import { ProgressRing } from "./progress-ring";
import { Sparkline } from "./sparkline";

/* ------------------------------------------------------------------ */
/*  Trend                                                              */
/* ------------------------------------------------------------------ */

type TrendDirection = "up" | "down" | "stable";

interface Trend {
  direction: TrendDirection;
  label: string;
}

const trendIcon: Record<TrendDirection, string> = {
  up: "↑",
  down: "↓",
  stable: "→",
};

const trendColor: Record<TrendDirection, string> = {
  up: "text-brand-500",
  down: "text-danger",
  stable: "text-muted",
};

/* ------------------------------------------------------------------ */
/*  Variant props                                                      */
/* ------------------------------------------------------------------ */

interface GradientStatCardProps {
  variant: "gradient";
  label: string;
  value: string | number;
  trend?: Trend;
  className?: string;
}

interface WhiteStatCardProps {
  variant: "white";
  label: string;
  value: string | number;
  trend?: Trend;
  sparklineData?: number[];
  className?: string;
}

interface RingStatCardProps {
  variant: "ring";
  label: string;
  percent: number;
  subtitle?: string;
  className?: string;
}

export type StatCardProps =
  | GradientStatCardProps
  | WhiteStatCardProps
  | RingStatCardProps;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function StatCard(props: StatCardProps) {
  switch (props.variant) {
    /* -------- GRADIENT -------- */
    case "gradient":
      return (
        <div
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-500 p-5 text-white ${props.className ?? ""}`}
        >
          {/* Decorative circle */}
          <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-white/10" />

          <p className="text-xs opacity-80">{props.label}</p>
          <p className="font-mono text-3xl font-extrabold">{props.value}</p>

          {props.trend && (
            <span className="mt-1 inline-block rounded bg-white/20 px-2 py-0.5 text-xs">
              {trendIcon[props.trend.direction]} {props.trend.label}
            </span>
          )}
        </div>
      );

    /* -------- WHITE -------- */
    case "white":
      return (
        <div
          className={`rounded-2xl border border-border bg-white p-5 ${props.className ?? ""}`}
        >
          <p className="text-xs text-muted">{props.label}</p>
          <p className="font-mono text-3xl font-extrabold text-text">
            {props.value}
          </p>

          {props.sparklineData && props.sparklineData.length >= 2 && (
            <div className="mt-2">
              <Sparkline data={props.sparklineData} />
            </div>
          )}

          {props.trend && (
            <span
              className={`mt-1 inline-block text-xs font-medium ${trendColor[props.trend.direction]}`}
            >
              {trendIcon[props.trend.direction]} {props.trend.label}
            </span>
          )}
        </div>
      );

    /* -------- RING -------- */
    case "ring":
      return (
        <div
          className={`flex flex-col items-center rounded-2xl border border-border bg-white p-5 text-center ${props.className ?? ""}`}
        >
          <p className="mb-3 text-xs text-muted">{props.label}</p>
          <ProgressRing percent={props.percent} size={72} />
          {props.subtitle && (
            <p className="mt-2 text-xs text-muted">{props.subtitle}</p>
          )}
        </div>
      );
  }
}

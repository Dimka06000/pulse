import type { HTMLAttributes, ReactNode } from "react";

type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "pro"
  | "record"
  | "verified"
  | "sport";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  success:
    "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800",
  warning:
    "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800",
  danger:
    "bg-gradient-to-r from-red-100 to-rose-100 text-red-800",
  info:
    "bg-gradient-to-r from-blue-100 to-sky-100 text-blue-800",
  pro:
    "bg-gradient-to-r from-indigo-500 to-violet-500 text-white",
  record:
    "bg-gradient-to-r from-amber-500 to-red-500 text-white",
  verified:
    "bg-brand-500 text-white",
  sport:
    "bg-surface text-muted",
};

function Badge({
  variant = "info",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        variantStyles[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge, type BadgeProps, type BadgeVariant };

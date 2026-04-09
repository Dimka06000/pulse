import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "dark" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-brand-500 to-cyan-500 text-white shadow-[var(--shadow-glow-green)]",
  dark: "bg-gradient-to-br from-slate-900 to-slate-800 text-white",
  secondary: "border border-border text-text hover:bg-surface",
  ghost: "text-muted hover:bg-surface hover:text-text",
  danger:
    "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[var(--shadow-glow-red)]",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-[6px]",
  md: "px-5 py-2.5 text-sm rounded-[6px]",
  lg: "px-8 py-3.5 text-base rounded-[10px]",
};

const Spinner = () => (
  <svg
    className="animate-spin -ml-1 mr-2 h-4 w-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          "inline-flex items-center justify-center font-medium transition-all duration-200",
          "focus:ring-2 focus:ring-brand-500/50 focus:ring-offset-2 focus:outline-none",
          variantStyles[variant],
          sizeStyles[size],
          isDisabled ? "opacity-50 pointer-events-none" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {loading && <Spinner />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button, type ButtonProps };

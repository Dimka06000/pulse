interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning';
  onRemove?: () => void;
}

export function Badge({ children, variant = 'default', onRemove }: BadgeProps) {
  const colors = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[variant]}`}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/10"
          aria-label="Retirer"
        >
          ×
        </button>
      )}
    </span>
  );
}

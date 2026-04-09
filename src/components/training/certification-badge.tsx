'use client';

interface CertificationBadgeProps {
  icon: string;
  title: string;
  completedAt?: string;
}

export function CertificationBadge({ icon, title, completedAt }: CertificationBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
      <span>{icon}</span>
      <span className="text-sm font-medium text-emerald-800">{title}</span>
      {completedAt && (
        <span className="text-xs text-emerald-500">
          {new Date(completedAt).toLocaleDateString('fr-FR')}
        </span>
      )}
    </div>
  );
}

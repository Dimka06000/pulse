import { cn } from '@/lib/utils';
import { formatDateFR } from '@/lib/date-utils';
import type { ReactNode } from 'react';

interface BookingCardProps {
  booking: {
    id: string;
    scheduled_at: string;
    end_at: string;
    status: string;
    session_templates?: { title: string; sport: string } | null;
    coach_profiles?: { profiles: { name: string } } | null;
  };
  children?: ReactNode;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  confirmed: { label: 'Confirmée', className: 'bg-green-50 text-green-700' },
  cancelled: { label: 'Annulée', className: 'bg-red-50 text-red-600' },
  completed: { label: 'Terminée', className: 'bg-gray-50 text-gray-600' },
  pending: { label: 'En attente', className: 'bg-yellow-50 text-yellow-700' },
};

export function BookingCard({ booking, children }: BookingCardProps) {
  const date = booking.scheduled_at.split('T')[0];
  const startTime = new Date(booking.scheduled_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = new Date(booking.end_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusInfo = STATUS_MAP[booking.status] || {
    label: booking.status,
    className: 'bg-gray-50 text-gray-600',
  };

  return (
    <div className="rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="font-semibold text-gray-900">{formatDateFR(date)}</p>
          <p className="text-sm text-gray-500">
            {startTime} &mdash; {endTime}
          </p>
          {booking.session_templates && (
            <p className="text-sm font-medium text-brand-600">
              {booking.session_templates.title} &middot; {booking.session_templates.sport}
            </p>
          )}
        </div>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded', statusInfo.className)}>
          {statusInfo.label}
        </span>
      </div>
      {children && <div>{children}</div>}
    </div>
  );
}

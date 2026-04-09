'use client';

import { Button } from '@/components/ui/button';
import { formatDateFR } from '@/lib/date-utils';
import { formatPrice } from '@oikos/coaching';

interface BookingSummaryProps {
  coachName: string;
  sessionTitle: string;
  date: string;
  slot: { start: string; end: string };
  priceCents: number;
  hasCredits: boolean;
  onConfirm: () => void;
  onPay: () => void;
  loading: boolean;
}

export function BookingSummary({
  coachName,
  sessionTitle,
  date,
  slot,
  priceCents,
  hasCredits,
  onConfirm,
  onPay,
  loading,
}: BookingSummaryProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 p-5 space-y-3">
        <h3 className="font-semibold text-gray-900">Récapitulatif</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Coach</span>
            <span className="font-medium text-gray-900">{coachName}</span>
          </div>
          <div className="flex justify-between">
            <span>Séance</span>
            <span className="font-medium text-gray-900">{sessionTitle}</span>
          </div>
          <div className="flex justify-between">
            <span>Date</span>
            <span className="font-medium text-gray-900">{formatDateFR(date)}</span>
          </div>
          <div className="flex justify-between">
            <span>Horaire</span>
            <span className="font-medium text-gray-900">
              {slot.start} &ndash; {slot.end}
            </span>
          </div>
          <hr className="border-gray-100" />
          <div className="flex justify-between text-base">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-brand-600">
              {hasCredits ? 'Inclus (crédit)' : formatPrice(priceCents)}
            </span>
          </div>
        </div>
      </div>

      {hasCredits ? (
        <Button onClick={onConfirm} disabled={loading} className="w-full">
          {loading ? 'Réservation en cours...' : 'Confirmer ma réservation'}
        </Button>
      ) : (
        <Button onClick={onPay} disabled={loading} className="w-full">
          {loading ? 'Redirection...' : `Payer ${formatPrice(priceCents)}`}
        </Button>
      )}
    </div>
  );
}

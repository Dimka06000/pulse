// packages/coaching/src/cancellation.ts
// Cancellation policy engine.
// Default: 24h before session = full refund. <24h = no refund.
// Coach cancels = always full refund to athlete.
// Configurable deadline per coach.

export type CancellationInput = {
  scheduledAt: string;          // ISO timestamp of session start
  cancelledBy: 'athlete' | 'coach' | 'platform';
  deadlineHours: number;        // Configurable per coach (default 24)
  nowIso?: string;              // Override for testing
};

export type CancellationResult = {
  allowed: boolean;
  refundType: 'full' | 'none';
  restoreCredit: boolean;
  reason: string;
};

export function evaluateCancellation(input: CancellationInput): CancellationResult {
  const { scheduledAt, cancelledBy, deadlineHours, nowIso } = input;
  const now = nowIso ? new Date(nowIso) : new Date();
  const sessionTime = new Date(scheduledAt);
  const hoursUntilSession = (sessionTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Coach or platform cancels -> always full refund
  if (cancelledBy === 'coach' || cancelledBy === 'platform') {
    return {
      allowed: true,
      refundType: 'full',
      restoreCredit: true,
      reason: cancelledBy === 'coach'
        ? 'Le coach a annulé la séance'
        : 'La plateforme a annulé la séance',
    };
  }

  // Athlete cancels with enough notice -> full refund
  if (hoursUntilSession >= deadlineHours) {
    return {
      allowed: true,
      refundType: 'full',
      restoreCredit: true,
      reason: `Annulation dans les délais (${deadlineHours}h avant)`,
    };
  }

  // Athlete cancels too late -> no refund
  return {
    allowed: true,
    refundType: 'none',
    restoreCredit: false,
    reason: `Annulation hors délai (moins de ${deadlineHours}h avant la séance)`,
  };
}

// packages/coaching/src/commission.ts
// Commission stacking: platform -> hierarchy -> collab split.
// Order matters: each layer applies to the remainder.
// See spec: "Payment Architecture" section.

export type CommissionInput = {
  /** Total amount in cents paid by athlete */
  totalCents: number;
  /** Platform fee percentage (e.g., 5 for 5%) */
  platformFeePercent: number;
  /** Senior commission percentage on remainder (0 if no hierarchy) */
  hierarchyPercent: number;
  /**
   * Collab revenue shares: { coachId: percent }.
   * Must sum to 100 if collaboration exists.
   * For solo coach: single entry with 100%.
   */
  collabShares: { coachId: string; percent: number }[];
};

export type CommissionBreakdown = {
  platformFeeCents: number;
  hierarchyFeeCents: number;
  seniorCoachId: string | null;
  payouts: { coachId: string; amountCents: number }[];
};

/**
 * Calculate commission breakdown for a booking payment.
 *
 * 1. Platform takes platformFeePercent of total
 * 2. Senior takes hierarchyPercent of remainder
 * 3. Collab shares split the rest
 */
export function calculateCommission(
  input: CommissionInput,
  seniorCoachId?: string
): CommissionBreakdown {
  const { totalCents, platformFeePercent, hierarchyPercent, collabShares } = input;

  // Step 1: Platform fee
  const platformFeeCents = Math.round((totalCents * platformFeePercent) / 100);
  let remainder = totalCents - platformFeeCents;

  // Step 2: Hierarchy fee (senior coach takes %)
  let hierarchyFeeCents = 0;
  if (hierarchyPercent > 0 && seniorCoachId) {
    hierarchyFeeCents = Math.round((remainder * hierarchyPercent) / 100);
    remainder -= hierarchyFeeCents;
  }

  // Step 3: Collab split on remainder
  const payouts = collabShares.map((share) => ({
    coachId: share.coachId,
    amountCents: Math.round((remainder * share.percent) / 100),
  }));

  // Adjust rounding: ensure sum of payouts + fees = total
  const payoutSum = payouts.reduce((s, p) => s + p.amountCents, 0);
  const totalDistributed = platformFeeCents + hierarchyFeeCents + payoutSum;
  const roundingDiff = totalCents - totalDistributed;
  if (roundingDiff !== 0 && payouts.length > 0) {
    // Give rounding cents to the first coach (lead)
    payouts[0]!.amountCents += roundingDiff;
  }

  return {
    platformFeeCents,
    hierarchyFeeCents,
    seniorCoachId: seniorCoachId || null,
    payouts,
  };
}

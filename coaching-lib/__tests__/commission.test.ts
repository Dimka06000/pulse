// packages/coaching/__tests__/commission.test.ts
import { describe, it, expect } from 'vitest';
import { calculateCommission } from '../src/commission';

describe('calculateCommission', () => {
  it('simple session: 1 coach, no hierarchy', () => {
    const result = calculateCommission({
      totalCents: 5000, // 50EUR
      platformFeePercent: 5,
      hierarchyPercent: 0,
      collabShares: [{ coachId: 'coach-1', percent: 100 }],
    });
    expect(result.platformFeeCents).toBe(250);
    expect(result.hierarchyFeeCents).toBe(0);
    expect(result.payouts).toEqual([{ coachId: 'coach-1', amountCents: 4750 }]);
  });

  it('collab session: 2 coaches, 60/40 split', () => {
    const result = calculateCommission({
      totalCents: 8000, // 80EUR
      platformFeePercent: 5,
      hierarchyPercent: 0,
      collabShares: [
        { coachId: 'coach-a', percent: 60 },
        { coachId: 'coach-b', percent: 40 },
      ],
    });
    expect(result.platformFeeCents).toBe(400);
    // Remainder: 7600. 60% = 4560, 40% = 3040
    expect(result.payouts[0]).toEqual({ coachId: 'coach-a', amountCents: 4560 });
    expect(result.payouts[1]).toEqual({ coachId: 'coach-b', amountCents: 3040 });
  });

  it('hierarchy: junior with senior taking 15%', () => {
    const result = calculateCommission(
      {
        totalCents: 4000, // 40EUR
        platformFeePercent: 5,
        hierarchyPercent: 15,
        collabShares: [{ coachId: 'junior', percent: 100 }],
      },
      'senior'
    );
    expect(result.platformFeeCents).toBe(200);
    // Remainder: 3800. Senior 15% = 570
    expect(result.hierarchyFeeCents).toBe(570);
    // Junior gets 3230
    expect(result.payouts).toEqual([{ coachId: 'junior', amountCents: 3230 }]);
  });

  it('3-way stacking: platform + hierarchy + collab', () => {
    const result = calculateCommission(
      {
        totalCents: 10000, // 100EUR
        platformFeePercent: 5,
        hierarchyPercent: 15,
        collabShares: [
          { coachId: 'junior', percent: 60 },
          { coachId: 'partner', percent: 40 },
        ],
      },
      'senior'
    );
    // Platform: 500
    expect(result.platformFeeCents).toBe(500);
    // Remainder: 9500. Senior 15% = 1425
    expect(result.hierarchyFeeCents).toBe(1425);
    // Remainder: 8075. Junior 60% = 4845, Partner 40% = 3230
    expect(result.payouts[0]).toEqual({ coachId: 'junior', amountCents: 4845 });
    expect(result.payouts[1]).toEqual({ coachId: 'partner', amountCents: 3230 });
    // Total: 500 + 1425 + 4845 + 3230 = 10000
    const total = result.platformFeeCents + result.hierarchyFeeCents +
      result.payouts.reduce((s, p) => s + p.amountCents, 0);
    expect(total).toBe(10000);
  });

  it('handles rounding correctly', () => {
    const result = calculateCommission({
      totalCents: 3333,
      platformFeePercent: 5,
      hierarchyPercent: 0,
      collabShares: [
        { coachId: 'a', percent: 33 },
        { coachId: 'b', percent: 33 },
        { coachId: 'c', percent: 34 },
      ],
    });
    const total = result.platformFeeCents +
      result.payouts.reduce((s, p) => s + p.amountCents, 0);
    expect(total).toBe(3333);
  });
});

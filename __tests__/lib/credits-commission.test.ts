import { describe, it, expect } from 'vitest';
import { findAvailableCredit, calculateCreditsForPlan, formatPrice } from '@oikos/coaching';
import { calculateCommission } from '@oikos/coaching';

describe('Credits', () => {
  const futureDate = '2027-01-01T00:00:00.000Z';
  const pastDate = '2020-01-01T00:00:00.000Z';

  describe('findAvailableCredit', () => {
    const baseCredit = {
      id: 'c1',
      user_id: 'u1',
      coach_id: 'coach1',
      total_sessions: 5,
      used_sessions: 2,
      expires_at: futureDate,
      session_template_id: null,
    };

    it('finds a valid credit for the coach', () => {
      const result = findAvailableCredit([baseCredit], 'coach1');
      expect(result).toEqual(baseCredit);
    });

    it('returns null for wrong coach', () => {
      const result = findAvailableCredit([baseCredit], 'other-coach');
      expect(result).toBeNull();
    });

    it('skips fully used credits', () => {
      const used = { ...baseCredit, used_sessions: 5 };
      const result = findAvailableCredit([used], 'coach1');
      expect(result).toBeNull();
    });

    it('skips expired credits', () => {
      const expired = { ...baseCredit, expires_at: pastDate };
      const result = findAvailableCredit([expired], 'coach1');
      expect(result).toBeNull();
    });

    it('accepts null expires_at (never expires)', () => {
      const noExpiry = { ...baseCredit, expires_at: null };
      const result = findAvailableCredit([noExpiry], 'coach1');
      expect(result).toEqual(noExpiry);
    });

    it('matches session_template_id when filtering', () => {
      const templateCredit = { ...baseCredit, session_template_id: 'tmpl1' };
      const result = findAvailableCredit([templateCredit], 'coach1', 'tmpl1');
      expect(result).toEqual(templateCredit);
    });

    it('skips credits with wrong template', () => {
      const templateCredit = { ...baseCredit, session_template_id: 'tmpl1' };
      const result = findAvailableCredit([templateCredit], 'coach1', 'tmpl2');
      expect(result).toBeNull();
    });

    it('universal credit (null template) matches any template filter', () => {
      const universal = { ...baseCredit, session_template_id: null };
      const result = findAvailableCredit([universal], 'coach1', 'any-template');
      expect(result).toEqual(universal);
    });

    it('returns first available from multiple credits', () => {
      const credits = [
        { ...baseCredit, id: 'c-used', used_sessions: 5 },
        { ...baseCredit, id: 'c-available', used_sessions: 1 },
      ];
      const result = findAvailableCredit(credits, 'coach1');
      expect(result?.id).toBe('c-available');
    });
  });

  describe('calculateCreditsForPlan', () => {
    it('single session = 1 credit, no expiry', () => {
      const result = calculateCreditsForPlan({
        type: 'single',
        sessions_count: 1,
        sessions_per_week: null,
        validity_days: null,
      });
      expect(result.totalSessions).toBe(1);
      expect(result.expiresAt).toBeNull();
    });

    it('pack of 10 sessions with 90 day validity', () => {
      const result = calculateCreditsForPlan({
        type: 'pack',
        sessions_count: 10,
        sessions_per_week: null,
        validity_days: 90,
      });
      expect(result.totalSessions).toBe(10);
      expect(result.expiresAt).not.toBeNull();
      // Expires ~90 days from now
      const daysUntilExpiry = (result.expiresAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(daysUntilExpiry).toBeGreaterThan(89);
      expect(daysUntilExpiry).toBeLessThan(91);
    });

    it('subscription 3x/week = 12 credits per month', () => {
      const result = calculateCreditsForPlan({
        type: 'subscription',
        sessions_count: null,
        sessions_per_week: 3,
        validity_days: null,
      });
      expect(result.totalSessions).toBe(12);
      expect(result.expiresAt).toBeNull();
    });
  });

  describe('formatPrice', () => {
    it('formats 5000 cents as EUR', () => {
      const result = formatPrice(5000);
      // French format: "50,00 €" or "50,00 EUR"
      expect(result).toMatch(/50[,.]00/);
    });

    it('formats 0 cents', () => {
      const result = formatPrice(0);
      expect(result).toMatch(/0[,.]00/);
    });
  });
});

describe('Commission', () => {
  it('solo coach with 5% platform fee', () => {
    const result = calculateCommission({
      totalCents: 5000,
      platformFeePercent: 5,
      hierarchyPercent: 0,
      collabShares: [{ coachId: 'coach1', percent: 100 }],
    });
    expect(result.platformFeeCents).toBe(250);
    expect(result.hierarchyFeeCents).toBe(0);
    expect(result.payouts).toHaveLength(1);
    expect(result.payouts[0].coachId).toBe('coach1');
    expect(result.payouts[0].amountCents).toBe(4750);
  });

  it('hierarchy: 10% to senior, 5% platform', () => {
    const result = calculateCommission(
      {
        totalCents: 10000,
        platformFeePercent: 5,
        hierarchyPercent: 10,
        collabShares: [{ coachId: 'junior', percent: 100 }],
      },
      'senior'
    );
    expect(result.platformFeeCents).toBe(500);
    expect(result.hierarchyFeeCents).toBe(950); // 10% of 9500
    expect(result.seniorCoachId).toBe('senior');
    expect(result.payouts[0].amountCents).toBe(8550); // 10000 - 500 - 950
  });

  it('collab split: 60/40 between two coaches', () => {
    const result = calculateCommission({
      totalCents: 10000,
      platformFeePercent: 10,
      hierarchyPercent: 0,
      collabShares: [
        { coachId: 'lead', percent: 60 },
        { coachId: 'assist', percent: 40 },
      ],
    });
    expect(result.platformFeeCents).toBe(1000);
    const remainder = 9000;
    expect(result.payouts[0].amountCents).toBe(Math.round(remainder * 0.6));
    expect(result.payouts[1].amountCents).toBe(Math.round(remainder * 0.4));
  });

  it('total distributed equals total input', () => {
    const result = calculateCommission(
      {
        totalCents: 9999,
        platformFeePercent: 15,
        hierarchyPercent: 20,
        collabShares: [
          { coachId: 'a', percent: 50 },
          { coachId: 'b', percent: 50 },
        ],
      },
      'senior'
    );
    const totalOut =
      result.platformFeeCents +
      result.hierarchyFeeCents +
      result.payouts.reduce((s, p) => s + p.amountCents, 0);
    expect(totalOut).toBe(9999);
  });
});

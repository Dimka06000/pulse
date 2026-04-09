// packages/coaching/__tests__/cancellation.test.ts
import { describe, it, expect } from 'vitest';
import { evaluateCancellation } from '../src/cancellation';

describe('evaluateCancellation', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const tomorrowIso = tomorrow.toISOString();

  const inTwoHours = new Date();
  inTwoHours.setHours(inTwoHours.getHours() + 2);
  const inTwoHoursIso = inTwoHours.toISOString();

  it('athlete cancels >24h before = full refund', () => {
    const result = evaluateCancellation({
      scheduledAt: tomorrowIso,
      cancelledBy: 'athlete',
      deadlineHours: 24,
    });
    expect(result.refundType).toBe('full');
    expect(result.restoreCredit).toBe(true);
  });

  it('athlete cancels <24h before = no refund', () => {
    const result = evaluateCancellation({
      scheduledAt: inTwoHoursIso,
      cancelledBy: 'athlete',
      deadlineHours: 24,
    });
    expect(result.refundType).toBe('none');
    expect(result.restoreCredit).toBe(false);
  });

  it('coach cancels = always full refund', () => {
    const result = evaluateCancellation({
      scheduledAt: inTwoHoursIso,
      cancelledBy: 'coach',
      deadlineHours: 24,
    });
    expect(result.refundType).toBe('full');
    expect(result.restoreCredit).toBe(true);
  });

  it('platform cancels = always full refund', () => {
    const result = evaluateCancellation({
      scheduledAt: inTwoHoursIso,
      cancelledBy: 'platform',
      deadlineHours: 24,
    });
    expect(result.refundType).toBe('full');
    expect(result.restoreCredit).toBe(true);
  });

  it('respects custom deadline (48h)', () => {
    const in30Hours = new Date();
    in30Hours.setHours(in30Hours.getHours() + 30);
    const result = evaluateCancellation({
      scheduledAt: in30Hours.toISOString(),
      cancelledBy: 'athlete',
      deadlineHours: 48,
    });
    expect(result.refundType).toBe('none'); // 30h < 48h deadline
  });
});

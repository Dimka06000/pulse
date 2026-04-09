import { describe, it, expect } from 'vitest';
import { evaluateCancellation } from '@oikos/coaching';

// These tests verify the cancellation business logic from the web app's perspective
describe('Cancellation refund logic', () => {
  const nowIso = '2026-04-08T10:00:00.000Z';

  it('full refund when athlete cancels 48h before session', () => {
    const result = evaluateCancellation({
      scheduledAt: '2026-04-10T10:00:00.000Z', // 48h later
      cancelledBy: 'athlete',
      deadlineHours: 24,
      nowIso,
    });
    expect(result.refundType).toBe('full');
    expect(result.restoreCredit).toBe(true);
    expect(result.allowed).toBe(true);
  });

  it('no refund when athlete cancels 2h before session', () => {
    const result = evaluateCancellation({
      scheduledAt: '2026-04-08T12:00:00.000Z', // 2h later
      cancelledBy: 'athlete',
      deadlineHours: 24,
      nowIso,
    });
    expect(result.refundType).toBe('none');
    expect(result.restoreCredit).toBe(false);
  });

  it('always full refund when coach cancels (even last minute)', () => {
    const result = evaluateCancellation({
      scheduledAt: '2026-04-08T10:30:00.000Z', // 30 min later
      cancelledBy: 'coach',
      deadlineHours: 24,
      nowIso,
    });
    expect(result.refundType).toBe('full');
    expect(result.restoreCredit).toBe(true);
  });

  it('always full refund when platform cancels', () => {
    const result = evaluateCancellation({
      scheduledAt: '2026-04-08T10:30:00.000Z',
      cancelledBy: 'platform',
      deadlineHours: 24,
      nowIso,
    });
    expect(result.refundType).toBe('full');
  });

  it('respects custom 48h deadline', () => {
    const result = evaluateCancellation({
      scheduledAt: '2026-04-09T20:00:00.000Z', // 34h later
      cancelledBy: 'athlete',
      deadlineHours: 48,
      nowIso,
    });
    // 34h < 48h deadline = no refund
    expect(result.refundType).toBe('none');
  });

  it('exactly at deadline boundary = full refund', () => {
    const result = evaluateCancellation({
      scheduledAt: '2026-04-09T10:00:00.000Z', // exactly 24h later
      cancelledBy: 'athlete',
      deadlineHours: 24,
      nowIso,
    });
    expect(result.refundType).toBe('full');
  });
});

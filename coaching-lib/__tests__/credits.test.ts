// packages/coaching/__tests__/credits.test.ts
import { describe, it, expect } from 'vitest';
import { findAvailableCredit, calculateCreditsForPlan, formatPrice } from '../src/credits';
import type { Credit } from '../src/credits';

const COACH_A = 'coach-a';
const COACH_B = 'coach-b';

function makeCredit(overrides: Partial<Credit> = {}): Credit {
  return {
    id: 'cr-1',
    user_id: 'user-1',
    coach_id: COACH_A,
    total_sessions: 10,
    used_sessions: 3,
    expires_at: null,
    session_template_id: null,
    ...overrides,
  };
}

describe('findAvailableCredit', () => {
  it('returns credit for the right coach', () => {
    const credits = [makeCredit({ coach_id: COACH_A }), makeCredit({ id: 'cr-2', coach_id: COACH_B })];
    const result = findAvailableCredit(credits, COACH_A);
    expect(result?.id).toBe('cr-1');
  });

  it('skips fully used credits', () => {
    const credits = [makeCredit({ used_sessions: 10 })];
    expect(findAvailableCredit(credits, COACH_A)).toBeNull();
  });

  it('skips expired credits', () => {
    const credits = [makeCredit({ expires_at: '2020-01-01T00:00:00Z' })];
    expect(findAvailableCredit(credits, COACH_A)).toBeNull();
  });

  it('filters by session_template_id when provided', () => {
    const credits = [
      makeCredit({ session_template_id: 'tpl-boxing' }),
      makeCredit({ id: 'cr-2', session_template_id: 'tpl-yoga' }),
    ];
    const result = findAvailableCredit(credits, COACH_A, 'tpl-yoga');
    expect(result?.id).toBe('cr-2');
  });

  it('accepts universal credit (null template) for any session', () => {
    const credits = [makeCredit({ session_template_id: null })];
    const result = findAvailableCredit(credits, COACH_A, 'tpl-whatever');
    expect(result?.id).toBe('cr-1');
  });
});

describe('calculateCreditsForPlan', () => {
  it('single: returns sessions_count or 1', () => {
    expect(calculateCreditsForPlan({ type: 'single', sessions_count: 1, sessions_per_week: null, validity_days: null }))
      .toEqual({ totalSessions: 1, expiresAt: null });
  });

  it('pack: returns count + expiry', () => {
    const result = calculateCreditsForPlan({ type: 'pack', sessions_count: 10, sessions_per_week: null, validity_days: 90 });
    expect(result.totalSessions).toBe(10);
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it('subscription: 4 weeks of sessions_per_week', () => {
    const result = calculateCreditsForPlan({ type: 'subscription', sessions_count: null, sessions_per_week: 2, validity_days: null });
    expect(result.totalSessions).toBe(8);
  });
});

describe('formatPrice', () => {
  it('formats cents to EUR', () => {
    // Intl may use non-breaking space — normalize
    const result = formatPrice(5000).replace(/\s/g, ' ');
    expect(result).toContain('50');
    expect(result).toContain('€');
  });
});

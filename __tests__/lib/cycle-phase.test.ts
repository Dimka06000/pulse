import { describe, it, expect } from 'vitest';
import { getCyclePhase } from '@/lib/training/cycle-phase';

describe('getCyclePhase', () => {
  const lastPeriod = '2026-04-01';

  it('returns menstruation for day 3', () => {
    const result = getCyclePhase(lastPeriod, 28, 5, '2026-04-04');
    expect(result.phase).toBe('menstruation');
    expect(result.intensityModifier).toBe(0.9);
  });

  it('returns follicular for day 8', () => {
    const result = getCyclePhase(lastPeriod, 28, 5, '2026-04-09');
    expect(result.phase).toBe('follicular');
    expect(result.intensityModifier).toBe(1.0);
  });

  it('returns ovulation for day 14 with ACL warning', () => {
    const result = getCyclePhase(lastPeriod, 28, 5, '2026-04-15');
    expect(result.phase).toBe('ovulation');
    expect(result.aclWarning).toBe(true);
  });

  it('returns luteal for day 22', () => {
    const result = getCyclePhase(lastPeriod, 28, 5, '2026-04-23');
    expect(result.phase).toBe('luteal');
    expect(result.intensityModifier).toBe(0.85);
  });

  it('wraps around for dates after cycle length', () => {
    const result = getCyclePhase(lastPeriod, 28, 5, '2026-05-02');
    expect(result.dayInCycle).toBe(3);
    expect(result.phase).toBe('menstruation');
  });
});

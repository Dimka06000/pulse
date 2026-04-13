import { describe, it, expect } from 'vitest';
import { calculateTSS } from '../../src/lib/training/tss-calculator';
import type { Activity } from '../../src/lib/training/types';

const baseActivity: Activity = {
  id: 'a1',
  userId: 'u1',
  discipline: 'run',
  name: 'Test Run',
  date: '2024-01-01',
  duration: 60,
};

describe('calculateTSS', () => {
  it('uses manual estimatedTss when provided', () => {
    const activity: Activity = { ...baseActivity, estimatedTss: 85 };
    expect(calculateTSS(activity, {})).toBe(85);
  });

  it('uses HR-based TRIMP when HR data and profile are available', () => {
    const activity: Activity = { ...baseActivity, duration: 60, avgHR: 150 };
    const profile = { maxHR: 190, restingHR: 50 };
    const tss = calculateTSS(activity, profile);
    // hrReserve = (150-50)/(190-50) = 100/140 ≈ 0.714
    // trimp = 1 * 0.714 * 0.64 * exp(1.92*0.714) ≈ 0.714 * 0.64 * 3.966 ≈ 1.812
    // tss = round(1.812 * 100) = 181
    expect(tss).toBeGreaterThan(0);
    // estimatedTss takes priority even if HR is present
    const withManual: Activity = { ...activity, estimatedTss: 50 };
    expect(calculateTSS(withManual, profile)).toBe(50);
  });

  it('uses RPE fallback: 60 min at RPE 7 = 70 TSS', () => {
    const activity: Activity = { ...baseActivity, duration: 60, rpe: 7 };
    expect(calculateTSS(activity, {})).toBe(70);
  });

  it('uses duration fallback: 60 min = 50 TSS', () => {
    const activity: Activity = { ...baseActivity, duration: 60 };
    expect(calculateTSS(activity, {})).toBe(50);
  });

  it('uses sufferScore when available and no HR data', () => {
    const activity: Activity = { ...baseActivity, sufferScore: 42 };
    expect(calculateTSS(activity, {})).toBe(42);
  });
});

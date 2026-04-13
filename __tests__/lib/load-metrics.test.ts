import { describe, it, expect } from 'vitest';
import { calculateLoadMetrics } from '../../src/lib/training/load-metrics';

describe('calculateLoadMetrics', () => {
  it('returns zeros for empty input', () => {
    const result = calculateLoadMetrics([]);
    expect(result.ctl).toBe(0);
    expect(result.atl).toBe(0);
    expect(result.tsb).toBe(0);
    expect(result.history).toHaveLength(0);
  });

  it('returns correct values for a single day', () => {
    const CTL_DECAY = 1 - Math.exp(-1 / 42);
    const ATL_DECAY = 1 - Math.exp(-1 / 7);
    const tss = 80;
    const expectedCtl = tss * CTL_DECAY;
    const expectedAtl = tss * ATL_DECAY;

    const result = calculateLoadMetrics([{ date: '2024-01-01', tss }]);
    expect(result.ctl).toBe(Math.round(expectedCtl));
    expect(result.atl).toBe(Math.round(expectedAtl));
    expect(result.tsb).toBe(Math.round(expectedCtl - expectedAtl));
    expect(result.history).toHaveLength(1);
  });

  it('produces higher ATL than CTL after 7 days of 100 TSS', () => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date('2024-01-01');
      d.setDate(d.getDate() + i);
      return { date: d.toISOString().slice(0, 10), tss: 100 };
    });
    const result = calculateLoadMetrics(days);
    // ATL (7-day) should converge faster than CTL (42-day) → ATL > CTL after 7 days of consistent load
    expect(result.atl).toBeGreaterThan(result.ctl);
    expect(result.history).toHaveLength(7);
  });

  it('fills missing days with 0 TSS', () => {
    // Provide day 1 and day 3 only — day 2 should be filled with 0
    const result = calculateLoadMetrics([
      { date: '2024-01-01', tss: 100 },
      { date: '2024-01-03', tss: 100 },
    ]);
    expect(result.history).toHaveLength(3);
    expect(result.history[1].date).toBe('2024-01-02');
    // On the filled day (TSS=0), ATL and CTL decrease from day 1 values
    const day1Atl = result.history[0].atl;
    const day2Atl = result.history[1].atl;
    expect(day2Atl).toBeLessThan(day1Atl);
  });
});

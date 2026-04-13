import { describe, it, expect } from 'vitest';
import { generateRecommendations } from '../../src/lib/training/recommendations';

describe('generateRecommendations', () => {
  it('warns overtraining at TSB -35', () => {
    const recs = generateRecommendations({ ctl: 80, atl: 115, tsb: -35 });
    const ids = recs.map((r) => r.id);
    expect(ids).toContain('overtraining-risk');
    const rec = recs.find((r) => r.id === 'overtraining-risk')!;
    expect(rec.priority).toBe('high');
    expect(rec.category).toBe('recovery');
  });

  it('recommends deload at week 3 of build phase', () => {
    const recs = generateRecommendations({ ctl: 60, atl: 65, tsb: -5, currentPhase: 'build', weekInPhase: 3 });
    const ids = recs.map((r) => r.id);
    expect(ids).toContain('deload-week');
    const rec = recs.find((r) => r.id === 'deload-week')!;
    expect(rec.priority).toBe('medium');
  });

  it('signals peak form at TSB +20 during build phase', () => {
    const recs = generateRecommendations({ ctl: 70, atl: 50, tsb: 20, currentPhase: 'build' });
    const ids = recs.map((r) => r.id);
    expect(ids).toContain('peak-form');
    const rec = recs.find((r) => r.id === 'peak-form')!;
    expect(rec.priority).toBe('low');
  });

  it('warns inactivity after 4 days outside taper/recovery', () => {
    const recs = generateRecommendations({ ctl: 50, atl: 40, tsb: 10, currentPhase: 'base', daysSinceLastActivity: 4 });
    const ids = recs.map((r) => r.id);
    expect(ids).toContain('inactivity');
    const rec = recs.find((r) => r.id === 'inactivity')!;
    expect(rec.message).toContain('4');
  });

  it('returns no warnings for healthy metrics', () => {
    const recs = generateRecommendations({ ctl: 60, atl: 62, tsb: -2, currentPhase: 'base', daysSinceLastActivity: 1 });
    expect(recs).toHaveLength(0);
  });

  it('does not warn inactivity during taper phase', () => {
    const recs = generateRecommendations({ ctl: 70, atl: 55, tsb: 15, currentPhase: 'taper', daysSinceLastActivity: 5 });
    const ids = recs.map((r) => r.id);
    expect(ids).not.toContain('inactivity');
  });
});

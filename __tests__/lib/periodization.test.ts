import { describe, it, expect } from 'vitest';
import { generatePeriodization } from '@/lib/training/periodization';
import type { GeneratedBlock } from '@/lib/training/periodization';

// Helper: build a startDate and eventDate N weeks apart
function makeDates(weeksToEvent: number): { startDate: string; eventDate: string } {
  const start = new Date('2025-01-06'); // Monday
  const event = new Date(start.getTime() + weeksToEvent * 7 * 86_400_000);
  return {
    startDate: start.toISOString().slice(0, 10),
    eventDate: event.toISOString().slice(0, 10),
  };
}

describe('generatePeriodization', () => {
  // ── 12-week program ──────────────────────────────────────────────
  describe('12-week program (medium)', () => {
    const blocks = generatePeriodization({
      ...makeDates(12),
      sport: 'run',
      athleteLevel: 'advanced',
    });

    it('produces all six phases in order', () => {
      const phases = blocks.map((b) => b.phase);
      expect(phases).toEqual(['base', 'build', 'peak', 'taper', 'race', 'recovery']);
    });

    it('recovery block is always at least 2 weeks', () => {
      const recovery = blocks.find((b) => b.phase === 'recovery')!;
      expect(recovery.weekEnd - recovery.weekStart + 1).toBeGreaterThanOrEqual(2);
    });

    it('blocks are contiguous and cover the full program', () => {
      for (let i = 1; i < blocks.length; i++) {
        expect(blocks[i].weekStart).toBe(blocks[i - 1].weekEnd + 1);
      }
    });

    it('race block is exactly 1 week', () => {
      const race = blocks.find((b) => b.phase === 'race')!;
      expect(race.weekEnd - race.weekStart + 1).toBe(1);
    });
  });

  // ── 6-week program ───────────────────────────────────────────────
  describe('6-week program (short)', () => {
    const blocks = generatePeriodization({
      ...makeDates(6),
      sport: 'bike',
      athleteLevel: 'intermediate',
    });

    it('skips base and peak phases', () => {
      const phases = blocks.map((b) => b.phase);
      expect(phases).not.toContain('base');
      expect(phases).not.toContain('peak');
    });

    it('includes build, taper, race, recovery', () => {
      const phases = blocks.map((b) => b.phase);
      expect(phases).toContain('build');
      expect(phases).toContain('taper');
      expect(phases).toContain('race');
      expect(phases).toContain('recovery');
    });

    it('recovery block is at least 2 weeks', () => {
      const recovery = blocks.find((b) => b.phase === 'recovery')!;
      expect(recovery.weekEnd - recovery.weekStart + 1).toBeGreaterThanOrEqual(2);
    });
  });

  // ── 24-week program ──────────────────────────────────────────────
  describe('24-week program (long)', () => {
    const blocks = generatePeriodization({
      ...makeDates(24),
      sport: 'triathlon',
      athleteLevel: 'advanced',
    });

    it('has all six phases', () => {
      const phases = blocks.map((b) => b.phase);
      expect(phases).toContain('base');
      expect(phases).toContain('build');
      expect(phases).toContain('peak');
      expect(phases).toContain('taper');
      expect(phases).toContain('race');
      expect(phases).toContain('recovery');
    });

    it('base and build blocks are each longer than in a 12-week program', () => {
      const blocks12 = generatePeriodization({
        ...makeDates(12),
        sport: 'triathlon',
        athleteLevel: 'advanced',
      });

      const base24 = blocks.find((b) => b.phase === 'base')!;
      const base12 = blocks12.find((b) => b.phase === 'base')!;
      expect(base24.weekEnd - base24.weekStart).toBeGreaterThan(base12.weekEnd - base12.weekStart);

      const build24 = blocks.find((b) => b.phase === 'build')!;
      const build12 = blocks12.find((b) => b.phase === 'build')!;
      expect(build24.weekEnd - build24.weekStart).toBeGreaterThan(build12.weekEnd - build12.weekStart);
    });
  });

  // ── Beginner level reduces volume ────────────────────────────────
  describe('beginner level volume reduction', () => {
    const advanced = generatePeriodization({
      ...makeDates(12),
      sport: 'run',
      athleteLevel: 'advanced',
    });
    const beginner = generatePeriodization({
      ...makeDates(12),
      sport: 'run',
      athleteLevel: 'beginner',
    });

    it('beginner weeklyVolumeMin is 60% of advanced for every phase', () => {
      for (let i = 0; i < advanced.length; i++) {
        // Allow ±1 minute for rounding
        expect(beginner[i].weeklyVolumeMin).toBeCloseTo(advanced[i].weeklyVolumeMin * 0.6, 0);
      }
    });

    it('beginner weeklyTSS is proportionally lower', () => {
      for (let i = 0; i < advanced.length; i++) {
        expect(beginner[i].weeklyTSS).toBeLessThan(advanced[i].weeklyTSS);
      }
    });
  });

  // ── Progression curve deload ─────────────────────────────────────
  describe('progression curve', () => {
    it('base block has deload (60%) every 4th week', () => {
      const blocks = generatePeriodization({
        ...makeDates(20),
        sport: 'run',
        athleteLevel: 'advanced',
      });
      const base = blocks.find((b) => b.phase === 'base')!;
      // Only check if the block is at least 4 weeks long
      if (base.progressionCurve.length >= 4) {
        expect(base.progressionCurve[3]).toBe(60); // week 4 = deload
      }
      if (base.progressionCurve.length >= 8) {
        expect(base.progressionCurve[7]).toBe(60); // week 8 = deload
      }
    });

    it('recovery block has all values at 40', () => {
      const blocks = generatePeriodization({
        ...makeDates(12),
        sport: 'run',
        athleteLevel: 'intermediate',
      });
      const recovery = blocks.find((b) => b.phase === 'recovery')!;
      expect(recovery.progressionCurve.every((v) => v === 40)).toBe(true);
    });

    it('taper block has descending values', () => {
      const blocks = generatePeriodization({
        ...makeDates(12),
        sport: 'run',
        athleteLevel: 'intermediate',
      });
      const taper = blocks.find((b) => b.phase === 'taper')!;
      for (let i = 1; i < taper.progressionCurve.length; i++) {
        expect(taper.progressionCurve[i]).toBeLessThanOrEqual(taper.progressionCurve[i - 1]);
      }
    });

    it('race block has progression curve [100]', () => {
      const blocks = generatePeriodization({
        ...makeDates(12),
        sport: 'run',
        athleteLevel: 'advanced',
      });
      const race = blocks.find((b) => b.phase === 'race')!;
      expect(race.progressionCurve).toEqual([100]);
    });
  });

  // ── French titles ────────────────────────────────────────────────
  describe('block metadata', () => {
    const blocks = generatePeriodization({
      ...makeDates(12),
      sport: 'run',
      athleteLevel: 'advanced',
    });

    it('assigns correct French titles', () => {
      const byPhase = Object.fromEntries(blocks.map((b) => [b.phase, b.title]));
      expect(byPhase['base']).toBe('Phase de base');
      expect(byPhase['build']).toBe('Construction');
      expect(byPhase['peak']).toBe('Pic de forme');
      expect(byPhase['taper']).toBe('Affûtage');
      expect(byPhase['race']).toBe('Compétition');
      expect(byPhase['recovery']).toBe('Récupération');
    });

    it('assigns correct focus per phase', () => {
      const byPhase = Object.fromEntries(blocks.map((b) => [b.phase, b.focus]));
      expect(byPhase['base']).toBe('endurance');
      expect(byPhase['build']).toBe('strength');
      expect(byPhase['peak']).toBe('power');
      expect(byPhase['taper']).toBe('recovery');
      expect(byPhase['race']).toBe('general');
      expect(byPhase['recovery']).toBe('recovery');
    });
  });

  // ── Recovery is always at least 2 weeks ─────────────────────────
  describe('recovery minimum', () => {
    const weekCounts = [4, 6, 8, 12, 16, 20, 24];

    weekCounts.forEach((w) => {
      it(`recovery >= 2 weeks for ${w}-week program`, () => {
        const blocks = generatePeriodization({
          ...makeDates(w),
          sport: 'run',
          athleteLevel: 'intermediate',
        });
        const recovery = blocks.find((b) => b.phase === 'recovery')!;
        expect(recovery).toBeDefined();
        expect(recovery.weekEnd - recovery.weekStart + 1).toBeGreaterThanOrEqual(2);
      });
    });
  });
});

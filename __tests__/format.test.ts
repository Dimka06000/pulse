import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDateFr,
  formatDateLongFr,
  timeAgoFr,
  formatDelta,
  formatNumber,
  weightSentence,
  frequencySentence,
} from '../src/lib/format';

// ─── formatDateFr ───────────────────────────────────────────────────

describe('formatDateFr', () => {
  it('should format date in French', () => {
    expect(formatDateFr('2026-03-12')).toBe('12 mars 2026');
  });

  it('should handle January', () => {
    expect(formatDateFr('2026-01-01')).toBe('1 janvier 2026');
  });

  it('should handle December', () => {
    expect(formatDateFr('2025-12-25')).toBe('25 décembre 2025');
  });
});

// ─── formatDateLongFr ───────────────────────────────────────────────

describe('formatDateLongFr', () => {
  it('should include day name capitalized', () => {
    // 2026-04-08 is a Wednesday
    const result = formatDateLongFr('2026-04-08');
    expect(result).toContain('2026');
    expect(result).toContain('avril');
    expect(result).toContain('8');
  });
});

// ─── timeAgoFr ──────────────────────────────────────────────────────

describe('timeAgoFr', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "aujourd\'hui" for today', () => {
    expect(timeAgoFr('2026-04-08T10:00:00')).toBe("aujourd'hui");
  });

  it('should return "hier" for yesterday', () => {
    expect(timeAgoFr('2026-04-07T10:00:00')).toBe('hier');
  });

  it('should return "il y a X jours" for 2-6 days', () => {
    expect(timeAgoFr('2026-04-05T10:00:00')).toBe('il y a 3 jours');
  });

  it('should return "il y a X semaine(s)" for 1-4 weeks', () => {
    expect(timeAgoFr('2026-03-25T10:00:00')).toBe('il y a 2 semaines');
  });

  it('should return "il y a 1 semaine" singular', () => {
    expect(timeAgoFr('2026-04-01T10:00:00')).toBe('il y a 1 semaine');
  });

  it('should return "il y a X mois" for months', () => {
    expect(timeAgoFr('2025-12-08T10:00:00')).toBe('il y a 4 mois');
  });

  it('should return "il y a X an(s)" for years', () => {
    expect(timeAgoFr('2024-04-08T10:00:00')).toBe('il y a 2 ans');
  });

  it('should return "il y a 1 an" singular', () => {
    expect(timeAgoFr('2025-04-01T10:00:00')).toBe('il y a 1 an');
  });
});

// ─── formatDelta ────────────────────────────────────────────────────

describe('formatDelta', () => {
  it('should add + for positive', () => {
    expect(formatDelta(2.5)).toBe('+2,5');
  });

  it('should show - for negative', () => {
    expect(formatDelta(-1.2)).toBe('-1,2');
  });

  it('should show 0 without sign', () => {
    expect(formatDelta(0)).toBe('0,0');
  });

  it('should use French decimal separator', () => {
    expect(formatDelta(3.7)).toContain(',');
    expect(formatDelta(3.7)).not.toContain('.');
  });
});

// ─── weightSentence ─────────────────────────────────────────────────

describe('weightSentence', () => {
  it('should describe weight loss', () => {
    expect(weightSentence('Marie', -2.5, 'ce mois')).toBe('Marie a perdu 2,5 kg ce mois');
  });

  it('should describe weight gain', () => {
    expect(weightSentence('Jean', 1.2, 'cette semaine')).toBe('Jean a pris 1,2 kg cette semaine');
  });

  it('should describe stable weight', () => {
    expect(weightSentence('Luc', 0.05, 'ce mois')).toBe('Luc a un poids stable ce mois');
  });
});

// ─── frequencySentence ──────────────────────────────────────────────

describe('frequencySentence', () => {
  it('should describe same frequency', () => {
    expect(frequencySentence(3, 3, 'cette semaine')).toBe('3 séances cette semaine, comme la période précédente');
  });

  it('should describe increase', () => {
    expect(frequencySentence(5, 3, 'ce mois')).toBe('5 séances ce mois, 2 de plus qu\'avant');
  });

  it('should describe decrease', () => {
    expect(frequencySentence(1, 4, 'ce mois')).toBe('1 séance ce mois, 3 de moins qu\'avant');
  });

  it('should handle singular', () => {
    expect(frequencySentence(1, 1, 'ce mois')).toBe('1 séance ce mois, comme la période précédente');
  });
});

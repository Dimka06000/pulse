import { describe, it, expect } from 'vitest';
import {
  computeWeeklyDigest,
  computeCorrelations,
  suggestWorkout,
  assessInjuryRisk,
} from '../../src/lib/intelligence/engine';

describe('computeWeeklyDigest', () => {
  it('computes basic stats', () => {
    const digest = computeWeeklyDigest({
      sessions: [
        { sport: 'running', duration_minutes: 45, scheduled_at: new Date().toISOString(), completed: true },
        { sport: 'running', duration_minutes: 30, scheduled_at: new Date().toISOString(), completed: true },
        { sport: 'yoga', duration_minutes: 60, scheduled_at: new Date().toISOString(), completed: true },
      ],
      lastWeekSessions: [{ duration_minutes: 40 }],
      records: [],
      streak: 5,
      journalEntries: [{ energy_level: 4, mood: 4, sleep_hours: 7.5 }],
    });
    expect(digest.totalSessions).toBe(3);
    expect(digest.totalMinutes).toBe(135);
    expect(digest.topSport?.sport).toBe('running');
    expect(digest.insights.length).toBeGreaterThan(0);
  });

  it('reports sessions down vs last week', () => {
    const digest = computeWeeklyDigest({
      sessions: [
        { sport: 'yoga', duration_minutes: 30, scheduled_at: new Date().toISOString(), completed: true },
      ],
      lastWeekSessions: [{ duration_minutes: 40 }, { duration_minutes: 50 }, { duration_minutes: 30 }],
      records: [],
      streak: 1,
      journalEntries: [],
    });
    expect(digest.vsLastWeek.sessions).toBe(-2);
    expect(digest.insights.some(i => i.includes('calme'))).toBe(true);
  });

  it('excludes incomplete sessions from totals', () => {
    const digest = computeWeeklyDigest({
      sessions: [
        { sport: 'running', duration_minutes: 45, scheduled_at: new Date().toISOString(), completed: true },
        { sport: 'running', duration_minutes: 60, scheduled_at: new Date().toISOString(), completed: false },
      ],
      lastWeekSessions: [],
      records: [],
      streak: 0,
      journalEntries: [],
    });
    expect(digest.totalSessions).toBe(1);
    expect(digest.totalMinutes).toBe(45);
  });

  it('includes new records in insights', () => {
    const digest = computeWeeklyDigest({
      sessions: [],
      lastWeekSessions: [],
      records: [
        { sport: 'running', metric_key: '5k', value: 22.5, unit: 'min', achieved_at: new Date().toISOString() },
      ],
      streak: 0,
      journalEntries: [],
    });
    expect(digest.newRecords.length).toBe(1);
    expect(digest.insights.some(i => i.includes('record'))).toBe(true);
  });

  it('detects fatigue from journal', () => {
    const digest = computeWeeklyDigest({
      sessions: [],
      lastWeekSessions: [],
      records: [],
      streak: 0,
      journalEntries: [
        { energy_level: 1, mood: 2, sleep_hours: 5 },
        { energy_level: 2, mood: 2, sleep_hours: 5.5 },
      ],
    });
    expect(digest.insights.some(i => i.includes('Fatigue'))).toBe(true);
  });
});

describe('computeCorrelations', () => {
  it('detects sleep impact on energy', () => {
    const entries = [
      // Good sleep days
      ...Array(5).fill(null).map((_, i) => ({
        date: `2026-04-0${i + 1}`,
        sleep_hours: 8,
        sleep_quality: 4,
        energy_level: 4,
        stress_level: 2,
        mood: 4,
        alcohol: false,
        caffeine_cups: 1,
      })),
      // Bad sleep days
      ...Array(5).fill(null).map((_, i) => ({
        date: `2026-04-${String(i + 6).padStart(2, '0')}`,
        sleep_hours: 5,
        sleep_quality: 2,
        energy_level: 2,
        stress_level: 4,
        mood: 2,
        alcohol: false,
        caffeine_cups: 1,
      })),
    ];
    const corrs = computeCorrelations(entries, []);
    const sleepEnergy = corrs.find(c => c.factor === 'sleep_hours' && c.metric === 'energy_level');
    expect(sleepEnergy).toBeDefined();
    expect(sleepEnergy!.direction).toBe('positive');
    expect(sleepEnergy!.deltaPercent).toBeGreaterThan(10);
  });

  it('returns empty for less than 7 entries', () => {
    const entries = Array(5).fill(null).map((_, i) => ({
      date: `2026-04-0${i + 1}`,
      sleep_hours: 7,
      sleep_quality: 3,
      energy_level: 3,
      stress_level: 3,
      mood: 3,
      alcohol: false,
      caffeine_cups: 1,
    }));
    expect(computeCorrelations(entries, [])).toEqual([]);
  });

  it('detects caffeine-stress correlation', () => {
    const entries = [
      ...Array(5).fill(null).map((_, i) => ({
        date: `2026-04-0${i + 1}`,
        sleep_hours: 7,
        sleep_quality: 3,
        energy_level: 3,
        stress_level: 4,
        mood: 3,
        alcohol: false,
        caffeine_cups: 4,
      })),
      ...Array(5).fill(null).map((_, i) => ({
        date: `2026-04-${String(i + 6).padStart(2, '0')}`,
        sleep_hours: 7,
        sleep_quality: 3,
        energy_level: 3,
        stress_level: 2,
        mood: 3,
        alcohol: false,
        caffeine_cups: 1,
      })),
    ];
    const corrs = computeCorrelations(entries, []);
    const caffeine = corrs.find(c => c.factor === 'caffeine');
    expect(caffeine).toBeDefined();
    expect(caffeine!.deltaPercent).toBeGreaterThan(10);
  });
});

describe('suggestWorkout', () => {
  it('suggests rest after intense period', () => {
    const now = new Date();
    const suggestion = suggestWorkout({
      recentSessions: [
        { sport: 'crossfit', duration_minutes: 60, scheduled_at: new Date(now.getTime() - 86400000).toISOString() },
        { sport: 'crossfit', duration_minutes: 75, scheduled_at: new Date(now.getTime() - 86400000 * 2).toISOString() },
        { sport: 'boxe', duration_minutes: 60, scheduled_at: new Date(now.getTime() - 86400000 * 3).toISOString() },
      ],
      journalToday: { energy_level: 2, sleep_hours: 5, stress_level: 4 },
      streak: 10,
      favoriteSports: ['crossfit'],
    });
    expect(['rest', 'light']).toContain(suggestion.type);
  });

  it('suggests moderate after inactivity', () => {
    const suggestion = suggestWorkout({
      recentSessions: [],
      journalToday: { energy_level: 4, sleep_hours: 8, stress_level: 1 },
      streak: 0,
      favoriteSports: ['running'],
    });
    expect(suggestion.type).toBe('moderate');
  });

  it('suggests light when energy is very low', () => {
    const suggestion = suggestWorkout({
      recentSessions: [
        { sport: 'running', duration_minutes: 30, scheduled_at: new Date().toISOString() },
      ],
      journalToday: { energy_level: 1, sleep_hours: 4, stress_level: 5 },
      streak: 3,
      favoriteSports: ['running'],
    });
    expect(suggestion.type).toBe('light');
  });

  it('suggests trying new sport on long streak', () => {
    const now = new Date();
    const suggestion = suggestWorkout({
      recentSessions: [
        { sport: 'running', duration_minutes: 40, scheduled_at: new Date(now.getTime() - 86400000).toISOString() },
      ],
      journalToday: { energy_level: 4, sleep_hours: 8, stress_level: 1 },
      streak: 20,
      favoriteSports: ['running', 'natation'],
    });
    // Should suggest natation (not running since it's already practiced)
    expect(suggestion.sport).toBe('natation');
  });
});

describe('assessInjuryRisk', () => {
  it('flags high risk on volume spike', () => {
    const now = new Date();
    const risk = assessInjuryRisk({
      sessionsLast14Days: [
        // This week: 6 sessions
        ...Array(6).fill(null).map((_, i) => ({
          duration_minutes: 60,
          sport: 'running',
          scheduled_at: new Date(now.getTime() - 86400000 * i).toISOString(),
        })),
        // Last week: 2 sessions
        ...Array(2).fill(null).map((_, i) => ({
          duration_minutes: 60,
          sport: 'running',
          scheduled_at: new Date(now.getTime() - 86400000 * (i + 7)).toISOString(),
        })),
      ],
      journalLast7Days: Array(7).fill({ energy_level: 2, stress_level: 4, sleep_hours: 5 }),
    });
    expect(risk.level).toBe('high');
    expect(risk.factors.length).toBeGreaterThan(0);
  });

  it('returns low risk for normal activity', () => {
    const now = new Date();
    const risk = assessInjuryRisk({
      sessionsLast14Days: [
        // This week: 3 sessions (days 0, 1, 2)
        ...Array(3).fill(null).map((_, i) => ({
          duration_minutes: 40,
          sport: 'yoga',
          scheduled_at: new Date(now.getTime() - 86400000 * (i + 1)).toISOString(),
        })),
        // Last week: 3 sessions (days 8, 9, 10)
        ...Array(3).fill(null).map((_, i) => ({
          duration_minutes: 40,
          sport: 'yoga',
          scheduled_at: new Date(now.getTime() - 86400000 * (i + 8)).toISOString(),
        })),
      ],
      journalLast7Days: Array(7).fill({ energy_level: 4, stress_level: 2, sleep_hours: 8 }),
    });
    expect(risk.level).toBe('low');
  });

  it('detects sleep + volume combo risk', () => {
    const now = new Date();
    const risk = assessInjuryRisk({
      sessionsLast14Days: Array(5).fill(null).map((_, i) => ({
        duration_minutes: 60,
        sport: 'crossfit',
        scheduled_at: new Date(now.getTime() - 86400000 * i).toISOString(),
      })),
      journalLast7Days: Array(7).fill({ energy_level: 3, stress_level: 3, sleep_hours: 5 }),
    });
    expect(risk.level).not.toBe('low');
    expect(risk.factors.some(f => f.includes('sommeil'))).toBe(true);
  });
});

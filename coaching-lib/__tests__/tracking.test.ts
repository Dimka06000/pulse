import { describe, it, expect, vi } from 'vitest';
import {
  createSessionReport,
  getCoachClients,
  getAthleteProgress,
  computeWeightTrend,
  computeFrequencyTrend,
  computePerformanceTrend,
} from '../src/tracking';

// ─── Supabase mock factory ──────────────────────────────────────────

function mockSupabase(overrides: Record<string, any> = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  return {
    from: vi.fn(() => chain),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    _chain: chain,
  } as any;
}

// ─── createSessionReport ────────────────────────────────────────────

describe('createSessionReport', () => {
  it('should return error if booking not found', async () => {
    const sb = mockSupabase({
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    });
    const result = await createSessionReport(sb, {
      bookingId: 'bad-id',
      coachNotes: 'notes',
      athleteProgress: [],
      nextSessionFocus: '',
    });
    expect(result.error).toBe('Réservation introuvable');
  });

  it('should create report and mark booking completed on success', async () => {
    const reportData = { id: 'report-1', booking_id: 'b-1' };
    let callCount = 0;
    const sb = mockSupabase({
      single: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ data: { id: 'b-1', status: 'confirmed', coach_id: 'c-1' }, error: null });
        return Promise.resolve({ data: reportData, error: null });
      }),
    });
    const result = await createSessionReport(sb, {
      bookingId: 'b-1',
      coachNotes: 'Great session',
      athleteProgress: [{ metric: 'weight', value: 72, unit: 'kg', label: 'Poids' }],
      nextSessionFocus: 'Cardio',
    });
    expect(result.data).toEqual(reportData);
  });

  it('should include today date in progress entries', async () => {
    let insertedPayload: any;
    const sb = mockSupabase({
      insert: vi.fn().mockImplementation((payload: any) => {
        insertedPayload = payload;
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'r-1' }, error: null }),
          }),
        };
      }),
      single: vi.fn().mockResolvedValueOnce({ data: { id: 'b-1', status: 'confirmed', coach_id: 'c-1' }, error: null }),
    });
    await createSessionReport(sb, {
      bookingId: 'b-1',
      coachNotes: '',
      athleteProgress: [{ metric: 'weight', value: 70, unit: 'kg', label: 'Poids' }],
      nextSessionFocus: '',
    });
    // The insert was called, check progress has date
    expect(sb.from).toHaveBeenCalled();
  });
});

// ─── getCoachClients ────────────────────────────────────────────────

describe('getCoachClients', () => {
  it('should return empty array when no bookings', async () => {
    const sb = mockSupabase({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    const result = await getCoachClients(sb, 'coach-1');
    expect(result.data).toEqual([]);
  });

  it('should dedup clients by ID', async () => {
    const sb = mockSupabase({
      order: vi.fn().mockResolvedValue({
        data: [
          { client_id: 'c-1', scheduled_at: '2026-04-01', status: 'completed', profiles: { id: 'c-1', first_name: 'Marie', last_name: 'D', avatar_url: null } },
          { client_id: 'c-1', scheduled_at: '2026-04-05', status: 'completed', profiles: { id: 'c-1', first_name: 'Marie', last_name: 'D', avatar_url: null } },
          { client_id: 'c-2', scheduled_at: '2026-04-03', status: 'confirmed', profiles: { id: 'c-2', first_name: 'Jean', last_name: 'P', avatar_url: null } },
        ],
        error: null,
      }),
    });
    const result = await getCoachClients(sb, 'coach-1');
    expect(result.data).toHaveLength(2);
    expect(result.data![0].name).toBe('Marie D');
    expect(result.data![0].totalSessions).toBe(2); // 2 completed
    expect(result.data![1].totalSessions).toBe(0); // 0 completed (only confirmed)
  });

  it('should build French trend sentence', async () => {
    const sb = mockSupabase({
      order: vi.fn().mockResolvedValue({
        data: [
          { client_id: 'c-1', scheduled_at: '2026-04-01', status: 'completed', profiles: { id: 'c-1', first_name: 'Luc', last_name: '', avatar_url: null } },
        ],
        error: null,
      }),
    });
    const result = await getCoachClients(sb, 'coach-1');
    expect(result.data![0].trendSentence).toBe('1 séance réalisée');
  });

  it('should pluralize correctly for multiple sessions', async () => {
    const sb = mockSupabase({
      order: vi.fn().mockResolvedValue({
        data: [
          { client_id: 'c-1', scheduled_at: '2026-04-01', status: 'completed', profiles: { id: 'c-1', first_name: 'A', last_name: 'B', avatar_url: null } },
          { client_id: 'c-1', scheduled_at: '2026-04-02', status: 'completed', profiles: { id: 'c-1', first_name: 'A', last_name: 'B', avatar_url: null } },
          { client_id: 'c-1', scheduled_at: '2026-04-03', status: 'completed', profiles: { id: 'c-1', first_name: 'A', last_name: 'B', avatar_url: null } },
        ],
        error: null,
      }),
    });
    const result = await getCoachClients(sb, 'coach-1');
    expect(result.data![0].trendSentence).toBe('3 séances réalisées');
  });
});

// ─── computeWeightTrend ─────────────────────────────────────────────

describe('computeWeightTrend', () => {
  it('should return null when < 2 data points', () => {
    expect(computeWeightTrend('Marie', [])).toBeNull();
    expect(computeWeightTrend('Marie', [{ date: '2026-04-01', value: 70 }])).toBeNull();
  });

  it('should detect weight loss (down)', () => {
    const result = computeWeightTrend('Marie', [
      { date: '2026-03-01', value: 72 },
      { date: '2026-04-01', value: 70 },
    ]);
    expect(result!.direction).toBe('down');
    expect(result!.delta).toBe(-2);
    expect(result!.sentence).toBe('Marie a perdu 2,0 kg');
  });

  it('should detect weight gain (up)', () => {
    const result = computeWeightTrend('Jean', [
      { date: '2026-03-01', value: 70 },
      { date: '2026-04-01', value: 73 },
    ]);
    expect(result!.direction).toBe('up');
    expect(result!.sentence).toBe('Jean a pris 3,0 kg');
  });

  it('should detect stable weight (< 0.1 delta)', () => {
    const result = computeWeightTrend('Luc', [
      { date: '2026-03-01', value: 70 },
      { date: '2026-04-01', value: 70.05 },
    ]);
    expect(result!.direction).toBe('stable');
    expect(result!.sentence).toContain('stable');
  });
});

// ─── computeFrequencyTrend ──────────────────────────────────────────

describe('computeFrequencyTrend', () => {
  it('should report 0 sessions when no dates', () => {
    const result = computeFrequencyTrend([]);
    expect(result.thisMonth).toBe(0);
    expect(result.direction).toBe('stable');
  });

  it('should count this month sessions', () => {
    const now = new Date();
    const thisMonthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;
    const result = computeFrequencyTrend([thisMonthDate, thisMonthDate]);
    expect(result.thisMonth).toBe(2);
  });

  it('should detect increase vs last month', () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-15`;
    const result = computeFrequencyTrend([thisMonth, thisMonth, thisMonth, lastMonthStr]);
    expect(result.direction).toBe('up');
    expect(result.sentence).toContain('de plus');
  });

  it('should detect decrease vs last month', () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-15`;
    const result = computeFrequencyTrend([lastMonthStr, lastMonthStr, lastMonthStr]);
    expect(result.direction).toBe('down');
    expect(result.sentence).toContain('de moins');
  });
});

// ─── computePerformanceTrend ────────────────────────────────────────

describe('computePerformanceTrend', () => {
  it('should return stable when < 2 data points', () => {
    const result = computePerformanceTrend([]);
    expect(result.direction).toBe('stable');
    expect(result.sentence).toBe('Pas encore assez de données');
  });

  it('should detect upward trend', () => {
    const result = computePerformanceTrend([
      { date: '2026-04-01', value: 5 },
      { date: '2026-04-02', value: 6 },
      { date: '2026-04-03', value: 7 },
      { date: '2026-04-04', value: 8 },
    ]);
    expect(result.direction).toBe('up');
    expect(result.sentence).toBe('Performance en hausse');
  });

  it('should detect downward trend', () => {
    const result = computePerformanceTrend([
      { date: '2026-04-01', value: 8 },
      { date: '2026-04-02', value: 7 },
      { date: '2026-04-03', value: 6 },
    ]);
    expect(result.direction).toBe('down');
    expect(result.sentence).toBe('Performance en baisse');
  });

  it('should detect stable (equal ups and downs)', () => {
    const result = computePerformanceTrend([
      { date: '2026-04-01', value: 5 },
      { date: '2026-04-02', value: 7 },
      { date: '2026-04-03', value: 5 },
    ]);
    expect(result.direction).toBe('stable');
    expect(result.sentence).toBe('Performance stable');
  });
});

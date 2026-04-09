import { describe, it, expect, vi } from 'vitest';
import {
  getNutritionPlan,
  createNutritionPlan,
  updateNutritionPlan,
  getCoachNutritionPlans,
} from '../src/nutrition';

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
  return { from: vi.fn(() => chain), _chain: chain } as any;
}

// ─── getNutritionPlan ───────────────────────────────────────────────

describe('getNutritionPlan', () => {
  it('should return null when no plan exists', async () => {
    const sb = mockSupabase({
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    });
    const result = await getNutritionPlan(sb, 'user-1');
    expect(result.data).toBeNull();
  });

  it('should return plan with coach name', async () => {
    const sb = mockSupabase({
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'plan-1',
          goal: 'Perte de poids',
          daily_calories: 1800,
          macros: { protein: 120, carbs: 200, fat: 50 },
          meals: [{ name: 'Déjeuner', description: 'Salade' }],
          vivo_sync_id: null,
          created_at: '2026-04-01',
          updated_at: '2026-04-01',
          coach: { profiles: { first_name: 'Jean', last_name: 'Coach' } },
        },
        error: null,
      }),
    });
    const result = await getNutritionPlan(sb, 'user-1');
    expect(result.data?.goal).toBe('Perte de poids');
    expect(result.data?.coachName).toBe('Jean Coach');
    expect(result.data?.dailyCalories).toBe(1800);
  });

  it('should handle plan without coach', async () => {
    const sb = mockSupabase({
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'plan-2',
          goal: 'Énergie',
          daily_calories: 2200,
          macros: { protein: 130, carbs: 280, fat: 70 },
          meals: [],
          vivo_sync_id: null,
          created_at: '2026-04-01',
          updated_at: '2026-04-01',
          coach: null,
        },
        error: null,
      }),
    });
    const result = await getNutritionPlan(sb, 'user-1');
    expect(result.data?.coachName).toBeUndefined();
  });
});

// ─── createNutritionPlan ────────────────────────────────────────────

describe('createNutritionPlan', () => {
  it('should create plan when macros match calories within 20%', async () => {
    const planData = { id: 'plan-1' };
    const sb = mockSupabase({
      single: vi.fn().mockResolvedValue({ data: planData, error: null }),
    });
    // 120*4 + 250*4 + 65*9 = 480 + 1000 + 585 = 2065 (within 20% of 2000)
    const result = await createNutritionPlan(sb, {
      userId: 'user-1',
      goal: 'Équilibre',
      dailyCalories: 2000,
      macros: { protein: 120, carbs: 250, fat: 65 },
      meals: [],
    });
    expect(result.data).toEqual(planData);
  });

  it('should reject when macros deviate > 20% from calories', async () => {
    const sb = mockSupabase();
    // 50*4 + 50*4 + 20*9 = 200 + 200 + 180 = 580 vs 2000 = way off
    const result = await createNutritionPlan(sb, {
      userId: 'user-1',
      goal: 'Test',
      dailyCalories: 2000,
      macros: { protein: 50, carbs: 50, fat: 20 },
      meals: [],
    });
    expect(result.error).toContain('ne correspondent pas');
    expect(result.error).toContain('580');
  });

  it('should pass coachId when provided', async () => {
    let insertedPayload: any;
    const sb = mockSupabase({
      insert: vi.fn().mockImplementation((payload: any) => {
        insertedPayload = payload;
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'p-1' }, error: null }),
          }),
        };
      }),
    });
    await createNutritionPlan(sb, {
      userId: 'user-1',
      coachId: 'coach-1',
      goal: 'Masse',
      dailyCalories: 2500,
      macros: { protein: 180, carbs: 300, fat: 75 },
      meals: [],
    });
    expect(sb.from).toHaveBeenCalledWith('nutrition_plans');
  });
});

// ─── updateNutritionPlan ────────────────────────────────────────────

describe('updateNutritionPlan', () => {
  it('should update only provided fields', async () => {
    const sb = mockSupabase({
      single: vi.fn().mockResolvedValue({ data: { id: 'p-1', goal: 'New goal' }, error: null }),
    });
    const result = await updateNutritionPlan(sb, 'p-1', { goal: 'New goal' });
    expect(result.data?.goal).toBe('New goal');
  });

  it('should return error on DB failure', async () => {
    const sb = mockSupabase({
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    });
    const result = await updateNutritionPlan(sb, 'bad-id', { goal: 'x' });
    expect(result.error).toBe('not found');
  });
});

// ─── getCoachNutritionPlans ─────────────────────────────────────────

describe('getCoachNutritionPlans', () => {
  it('should return empty array when no plans', async () => {
    const sb = mockSupabase({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    const result = await getCoachNutritionPlans(sb, 'coach-1');
    expect(result.data).toEqual([]);
  });

  it('should return plans without meal details (privacy)', async () => {
    const sb = mockSupabase({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'p-1',
            goal: 'Perte de poids',
            daily_calories: 1800,
            macros: { protein: 120, carbs: 200, fat: 50 },
            created_at: '2026-04-01',
            profiles: { first_name: 'Marie', last_name: 'D', avatar_url: null },
          },
        ],
        error: null,
      }),
    });
    const result = await getCoachNutritionPlans(sb, 'coach-1');
    expect(result.data).toHaveLength(1);
    // Coach sees macros but NOT meals (privacy rule)
    expect(result.data![0].macros).toBeDefined();
    expect(result.data![0]).not.toHaveProperty('meals');
  });
});

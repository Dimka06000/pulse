import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get the active nutrition plan for an athlete.
 * Returns the most recent plan (coach-assigned or self-created).
 */
export async function getNutritionPlan(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from('nutrition_plans')
    .select(`
      id,
      goal,
      daily_calories,
      macros,
      meals,
      vivo_sync_id,
      created_at,
      updated_at,
      coach:coach_id (
        profiles:user_id (first_name, last_name)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') return { error: error.message };

  if (!data) return { data: null };

  // Flatten coach name
  const coachProfile = (data.coach as any)?.profiles;
  const coachName = coachProfile
    ? [coachProfile.first_name, coachProfile.last_name].filter(Boolean).join(' ')
    : undefined;

  return {
    data: {
      id: data.id,
      goal: data.goal,
      dailyCalories: data.daily_calories,
      macros: data.macros as { protein: number; carbs: number; fat: number },
      meals: data.meals as Array<{ name: string; time?: string; description: string; calories?: number }>,
      coachName,
      vivoSyncId: data.vivo_sync_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  };
}

/**
 * Create a nutrition plan. Coach assigns to athlete, or athlete creates own.
 */
export async function createNutritionPlan(
  supabase: SupabaseClient,
  input: {
    userId: string;
    coachId?: string;
    goal: string;
    dailyCalories: number;
    macros: { protein: number; carbs: number; fat: number };
    meals: Array<{ name: string; time?: string; description: string; calories?: number }>;
    vivoSyncId?: string;
  }
) {
  // Validate macros sum roughly to calories (4*P + 4*C + 9*F ~ dailyCalories +/- 20%)
  const macroCalories = input.macros.protein * 4 + input.macros.carbs * 4 + input.macros.fat * 9;
  const tolerance = input.dailyCalories * 0.2;
  if (Math.abs(macroCalories - input.dailyCalories) > tolerance) {
    return {
      error: `Les macros (${macroCalories} kcal) ne correspondent pas aux calories quotidiennes (${input.dailyCalories} kcal)`,
    };
  }

  const { data, error } = await supabase
    .from('nutrition_plans')
    .insert({
      user_id: input.userId,
      coach_id: input.coachId || null,
      goal: input.goal,
      daily_calories: input.dailyCalories,
      macros: input.macros,
      meals: input.meals,
      vivo_sync_id: input.vivoSyncId || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

/**
 * Update an existing nutrition plan.
 */
export async function updateNutritionPlan(
  supabase: SupabaseClient,
  planId: string,
  updates: {
    goal?: string;
    dailyCalories?: number;
    macros?: { protein: number; carbs: number; fat: number };
    meals?: Array<{ name: string; time?: string; description: string; calories?: number }>;
    vivoSyncId?: string;
  }
) {
  const updatePayload: Record<string, unknown> = {};
  if (updates.goal !== undefined) updatePayload.goal = updates.goal;
  if (updates.dailyCalories !== undefined) updatePayload.daily_calories = updates.dailyCalories;
  if (updates.macros !== undefined) updatePayload.macros = updates.macros;
  if (updates.meals !== undefined) updatePayload.meals = updates.meals;
  if (updates.vivoSyncId !== undefined) updatePayload.vivo_sync_id = updates.vivoSyncId;

  const { data, error } = await supabase
    .from('nutrition_plans')
    .update(updatePayload)
    .eq('id', planId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

/**
 * Get all nutrition plans for a coach's clients.
 * PRIVACY: Coach sees macros/micros ONLY, never meal details.
 */
export async function getCoachNutritionPlans(
  supabase: SupabaseClient,
  coachId: string
) {
  const { data, error } = await supabase
    .from('nutrition_plans')
    .select(`
      id,
      goal,
      daily_calories,
      macros,
      created_at,
      profiles:user_id (first_name, last_name, avatar_url)
    `)
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message, data: [] };
  return { data };
}

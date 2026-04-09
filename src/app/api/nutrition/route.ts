import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getNutritionPlan, createNutritionPlan } from '@oikos/coaching/nutrition';

export async function GET(request: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  // Check if requesting for a specific athlete (coach) or self (athlete)
  const athleteId = request.nextUrl.searchParams.get('athleteId') || user.id;

  const result = await getNutritionPlan(supabase, athleteId);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result.data);
}

export async function POST(request: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  const body = await request.json();

  // If coach is assigning, get their coach profile ID
  let coachId: string | undefined;
  if (body.asCoach) {
    const { data: coachProfile } = await supabase
      .from('coach_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    coachId = coachProfile?.id;
  }

  const result = await createNutritionPlan(supabase, {
    userId: body.userId || user.id,
    coachId,
    goal: body.goal,
    dailyCalories: body.dailyCalories,
    macros: body.macros,
    meals: body.meals || [],
    vivoSyncId: body.vivoSyncId,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data, { status: 201 });
}

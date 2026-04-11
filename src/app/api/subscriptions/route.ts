import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

// GET /api/subscriptions — list user's active subscriptions
export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const admin = getSupabaseAdminClient();

  const { data: subs } = await admin
    .from('subscriptions')
    .select('id, status, current_period_end, cancel_at_period_end, pricing_plans(coach_id, sessions_per_week, name, coach_profiles:coach_id(user_id, profiles:user_id(first_name)))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const enriched = (subs || []).map((s) => {
    const plan = s.pricing_plans as any;
    const coachName = plan?.coach_profiles?.profiles?.first_name || 'Coach';
    return {
      id: s.id,
      status: s.status,
      current_period_end: s.current_period_end,
      cancel_at_period_end: s.cancel_at_period_end,
      sessions_per_period: (plan?.sessions_per_week || 1) * 4,
      coach_name: coachName,
      plan_name: plan?.name || 'Abonnement',
    };
  });

  return NextResponse.json(enriched);
}

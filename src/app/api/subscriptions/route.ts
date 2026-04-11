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
    .select('id, status, current_period_end, cancel_at_period_end, sessions_per_period, coach_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const enriched = await Promise.all((subs || []).map(async (s) => {
    let coachName = 'Coach';
    if (s.coach_id) {
      const { data: cp } = await admin.from('coach_profiles').select('user_id').eq('id', s.coach_id).single();
      if (cp) {
        const { data: p } = await admin.from('profiles').select('first_name').eq('id', cp.user_id).single();
        if (p) coachName = p.first_name || 'Coach';
      }
    }
    return { ...s, coach_name: coachName };
  }));

  return NextResponse.json(enriched);
}

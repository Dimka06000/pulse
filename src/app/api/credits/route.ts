import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

// GET /api/credits — list active credits for current user
export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const admin = getSupabaseAdminClient();

  const { data: credits } = await admin
    .from('user_credits')
    .select('id, total_sessions, used_sessions, expires_at, coach_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Enrich with coach name
  const enriched = await Promise.all((credits || []).map(async (c) => {
    let coachName = 'Coach';
    if (c.coach_id) {
      const { data: cp } = await admin.from('coach_profiles').select('user_id').eq('id', c.coach_id).single();
      if (cp) {
        const { data: p } = await admin.from('profiles').select('first_name').eq('id', cp.user_id).single();
        if (p) coachName = p.first_name || 'Coach';
      }
    }
    return { ...c, coach_name: coachName };
  }));

  return NextResponse.json(enriched);
}

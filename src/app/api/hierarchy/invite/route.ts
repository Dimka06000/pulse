import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { inviteJunior } from '@oikos/coaching/hierarchy';

export async function POST(req: NextRequest) {
  try {
    const authClient = await getSupabaseServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const supabase = getSupabaseAdminClient();

    // Get caller's coach profile
    const { data: coachProfile } = await supabase
      .from('coach_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!coachProfile) return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });

    const body = await req.json();
    const result = await inviteJunior(supabase, coachProfile.id, {
      juniorCoachId: body.juniorCoachId,
      mode: body.mode,
      commissionSplit: body.commissionSplit,
      seniorApprovalRequired: body.seniorApprovalRequired ?? false,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

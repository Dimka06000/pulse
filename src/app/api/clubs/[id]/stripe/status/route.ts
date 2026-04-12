import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAccountStatus } from '@/lib/stripe/connect';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  try {
    // Verify user is admin in this club
    const { data: membership } = await (supabase as any)
      .from('club_members')
      .select('role')
      .eq('club_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle() as { data: { role: string } | null };

    if (!membership || !['founder', 'coach_admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { data: club } = await (supabase as any)
      .from('clubs')
      .select('stripe_account_id')
      .eq('id', id)
      .single() as { data: { stripe_account_id: string | null } | null };

    if (!club?.stripe_account_id) {
      return NextResponse.json({ connected: false });
    }

    const status = await getAccountStatus(club.stripe_account_id);
    return NextResponse.json({ connected: true, ...status });
  } catch (err: any) {
    console.error('[GET /api/clubs/[id]/stripe/status]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

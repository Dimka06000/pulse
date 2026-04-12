import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createConnectedAccount, createAccountLink } from '@/lib/stripe/connect';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  try {
    // Verify caller is founder
    const { data: membership } = await (supabase as any)
      .from('club_members')
      .select('role')
      .eq('club_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle() as { data: { role: string } | null };

    if (!membership || membership.role !== 'founder') {
      return NextResponse.json(
        { error: 'Seul le fondateur peut configurer les paiements' },
        { status: 403 },
      );
    }

    const { data: club } = await (supabase as any)
      .from('clubs')
      .select('slug, stripe_account_id')
      .eq('id', id)
      .single() as { data: { slug: string; stripe_account_id: string | null } | null };

    if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 });

    let accountId = club.stripe_account_id;

    if (!accountId) {
      accountId = await createConnectedAccount(user.email!);
      await (supabase as any)
        .from('clubs')
        .update({ stripe_account_id: accountId })
        .eq('id', id);
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100';
    const returnUrl = `${origin}/clubs/${club.slug}/manage/stripe?return=true`;
    const url = await createAccountLink(accountId, returnUrl, returnUrl);

    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('[POST /api/clubs/[id]/stripe/onboard]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

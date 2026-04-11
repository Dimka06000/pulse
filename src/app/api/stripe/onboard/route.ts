import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createConnectedAccount, createAccountLink } from '@/lib/stripe/connect';

export async function POST() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();

  // Must be a coach
  const { data: coachProfile } = await adminClient
    .from('coach_profiles')
    .select('id, stripe_account_id')
    .eq('user_id', user.id)
    .single();

  if (!coachProfile) {
    return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });
  }

  try {
    let accountId = coachProfile.stripe_account_id;

    if (!accountId) {
      accountId = await createConnectedAccount(user.email!);
      await adminClient
        .from('coach_profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', coachProfile.id);
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100';
    const url = await createAccountLink(
      accountId,
      `${origin}/coach/stripe?return=true`,
      `${origin}/coach/stripe?return=true`
    );

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Stripe onboarding error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAccountStatus } from '@/lib/stripe/connect';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();

  const { data: coachProfile } = await adminClient
    .from('coach_profiles')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .single();

  if (!coachProfile?.stripe_account_id) {
    return NextResponse.json({ connected: false });
  }

  try {
    const status = await getAccountStatus(coachProfile.stripe_account_id);
    return NextResponse.json({ connected: true, ...status });
  } catch (error) {
    console.error('Stripe status error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

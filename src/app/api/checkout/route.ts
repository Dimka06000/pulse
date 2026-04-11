import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getOrCreateStripeCustomer } from '@/lib/stripe/customers';
import { createCheckoutSession } from '@/lib/stripe/checkout';
import { calculateCommission } from '@oikos/coaching';

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body: {
    coach_id: string;
    session_template_id: string;
    scheduled_at: string;
    end_at: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const { coach_id, session_template_id, scheduled_at, end_at } = body;
  const adminClient = getSupabaseAdminClient();

  // Fetch session template + coach profile
  const { data: template } = await adminClient
    .from('session_templates')
    .select('id, title, description, price, duration, coach_id')
    .eq('id', session_template_id)
    .eq('coach_id', coach_id)
    .single();

  if (!template) {
    return NextResponse.json({ error: 'Séance introuvable' }, { status: 404 });
  }

  const { data: coachProfile } = await adminClient
    .from('coach_profiles')
    .select('stripe_account_id')
    .eq('id', coach_id)
    .single();

  // If coach has no Stripe Connect, payment goes directly to platform
  const hasConnect = !!coachProfile?.stripe_account_id;

  // Get platform fee
  const { data: feeSetting } = await adminClient
    .from('app_settings')
    .select('value')
    .eq('key', 'platform_fee_percent')
    .single();

  const platformFeePercent = parseFloat(feeSetting?.value || '5');

  // Check hierarchy (is this coach a junior?)
  const { data: hierarchy } = await adminClient
    .from('coach_hierarchy')
    .select('senior_id, commission_split')
    .eq('junior_id', coach_id)
    .eq('status', 'active')
    .maybeSingle();

  const priceCents = Math.round(template.price * 100);

  // Calculate commission
  const commission = calculateCommission(
    {
      totalCents: priceCents,
      platformFeePercent,
      hierarchyPercent: hierarchy?.commission_split || 0,
      collabShares: [{ coachId: coach_id, percent: 100 }],
    },
    hierarchy?.senior_id || undefined
  );

  // Get or create athlete's Stripe customer
  const { data: profile } = await adminClient
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single();

  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.email || 'Athlète';
  const customerId = await getOrCreateStripeCustomer(user.id, user.email!, userName);

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100';

  try {
    const url = await createCheckoutSession({
      sessionName: template.title,
      description: template.description,
      priceCents,
      paymentType: 'one_time',
      stripePriceId: null,
      customerId,
      connectedAccountId: hasConnect ? coachProfile.stripe_account_id : null,
      applicationFeeCents: hasConnect ? commission.platformFeeCents : 0,
      userId: user.id,
      coachId: coach_id,
      sessionTemplateId: session_template_id,
      bookingData: { session_template_id, scheduled_at, end_at },
      origin,
    });

    return NextResponse.json({ url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Checkout error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

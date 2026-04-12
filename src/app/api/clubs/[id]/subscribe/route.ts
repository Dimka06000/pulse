import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getStripeClient } from '@/lib/stripe/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  try {
    const { plan_id } = await req.json();

    // Lookup plan
    const { data: plan, error: planError } = await supabase
      .from('club_membership_plans')
      .select('*')
      .eq('id', plan_id)
      .eq('club_id', id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan introuvable' }, { status: 404 });
    }

    // Free plan — member already joined via /members
    if (plan.price_cents === 0) {
      return NextResponse.json({ message: 'Plan gratuit — adhésion directe' });
    }

    // Lookup club
    const { data: club } = await supabase
      .from('clubs')
      .select('stripe_account_id')
      .eq('id', id)
      .single();

    if (!club?.stripe_account_id) {
      return NextResponse.json({ error: 'Le club n\'a pas de compte Stripe connecté' }, { status: 400 });
    }

    // Lookup or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, first_name, last_name')
      .eq('id', user.id)
      .single();

    const stripe = getStripeClient();
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', user.id);
    }

    // Lookup club_member_id
    const { data: memberRow } = await supabase
      .from('club_members')
      .select('id')
      .eq('club_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const headersList = await headers();
    const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';
    const successUrl = `${origin}/paiement/succes?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/paiement/annule`;

    const metadata = {
      user_id: user.id,
      club_id: id,
      plan_id,
      club_member_id: memberRow?.id || '',
      payment_type: 'club_membership',
    };

    let session;

    if (plan.interval === 'month' || plan.interval === 'year') {
      // Recurring subscription
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
        subscription_data: {
          transfer_data: { destination: club.stripe_account_id },
          application_fee_percent: 5,
        },
        metadata,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
    } else {
      // One-time payment
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
        payment_intent_data: {
          transfer_data: { destination: club.stripe_account_id },
          application_fee_amount: Math.round(plan.price_cents * 0.05),
        },
        metadata,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
    }

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[POST /api/clubs/[id]/subscribe]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

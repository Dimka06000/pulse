// Webhook handlers for Stripe events.
// Extracted from Elaubody webhooks.ts — adapted for multi-coach.
import type Stripe from 'stripe';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getStripeClient } from './client';

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  return {
    periodStart: item.current_period_start,
    periodEnd: item.current_period_end,
  };
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const supabase = getSupabaseAdminClient();
  const metadata = session.metadata || {};
  const { user_id, coach_id, session_template_id, payment_type } = metadata;

  if (!user_id || !coach_id) {
    console.error('Webhook: metadata missing in checkout.session.completed');
    return;
  }

  // Idempotency
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle();

  if (existing) return;

  const amountTotal = session.amount_total || 0;
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null;

  // Create payment record
  const { data: payment } = await supabase
    .from('payments')
    .insert({
      user_id,
      amount_cents: amountTotal,
      status: 'succeeded',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
    })
    .select('id')
    .single();

  if (!payment) return;

  // For one-time payments, create a single-session credit
  if (payment_type !== 'subscription') {
    await supabase.from('user_credits').insert({
      user_id,
      coach_id,
      payment_id: payment.id,
      total_sessions: 1,
      used_sessions: 0,
      expires_at: null,
    });
  }

  // Send payment confirmation (fire-and-forget)
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('email, first_name')
    .eq('id', user_id)
    .single();

  if (userProfile?.email) {
    import('@/lib/notifications').then(({ sendPaymentConfirmation }) => {
      sendPaymentConfirmation(userProfile.email, {
        athleteName: userProfile.first_name || 'Utilisateur',
        amount: `${(amountTotal / 100).toFixed(2)} EUR`,
        sessionTitle: metadata.session_title || 'Séance',
      }).catch(console.error);
    });
  }

  // If booking data is in metadata, create the booking
  if (metadata.booking_data) {
    await tryCreateBooking(supabase, user_id, coach_id, payment.id, metadata.booking_data);
  }
}

export async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionDetails = invoice.parent?.subscription_details;
  if (!subscriptionDetails) return;

  const supabase = getSupabaseAdminClient();
  const subscriptionId =
    typeof subscriptionDetails.subscription === 'string'
      ? subscriptionDetails.subscription
      : subscriptionDetails.subscription;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*, pricing_plans!inner(coach_id, sessions_per_week)')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!sub) return;

  const plan = sub.pricing_plans as { coach_id: string; sessions_per_week: number | null };

  // Idempotency
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_invoice_id', invoice.id)
    .maybeSingle();

  if (existingPayment) return;
  if (invoice.billing_reason === 'subscription_create') return;

  // Renew credits for next period
  const stripe = getStripeClient();
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId as string);
  const { periodStart, periodEnd } = getSubscriptionPeriod(stripeSubscription);

  const { data: renewalPayment } = await supabase.from('payments').insert({
    user_id: sub.user_id,
    pricing_plan_id: sub.pricing_plan_id,
    amount_cents: invoice.amount_paid || 0,
    status: 'succeeded',
    payment_type: 'subscription',
    stripe_invoice_id: invoice.id,
  }).select('id').single();

  // Subscription credits: sessions_per_week * 4 (monthly)
  await supabase.from('user_credits').insert({
    user_id: sub.user_id,
    coach_id: plan.coach_id,
    payment_id: renewalPayment?.id || null,
    total_sessions: (plan.sessions_per_week || 1) * 4,
    used_sessions: 0,
    expires_at: new Date(periodEnd * 1000).toISOString(),
  });

  await supabase
    .from('subscriptions')
    .update({
      current_period_start: new Date(periodStart * 1000).toISOString(),
      current_period_end: new Date(periodEnd * 1000).toISOString(),
    })
    .eq('id', sub.id);
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabase = getSupabaseAdminClient();
  const { periodStart, periodEnd } = getSubscriptionPeriod(subscription);

  await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(periodStart * 1000).toISOString(),
      current_period_end: new Date(periodEnd * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('stripe_subscription_id', subscription.id);
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = getSupabaseAdminClient();
  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subscription.id);
}

// ---- Helper: create booking from webhook metadata ----

async function tryCreateBooking(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  coachId: string,
  paymentId: string,
  bookingDataJson: string
) {
  try {
    const data = JSON.parse(bookingDataJson);
    const { session_template_id, scheduled_at, end_at } = data;

    if (!session_template_id || !scheduled_at) {
      console.error('Webhook: incomplete booking_data');
      return;
    }

    // Consume a credit atomically
    const { data: credit } = await supabase
      .from('user_credits')
      .select('id, used_sessions, total_sessions')
      .eq('user_id', userId)
      .eq('coach_id', coachId)
      .order('expires_at', { ascending: true, nullsFirst: false })
      .limit(1)
      .single();

    let creditId: string | null = null;
    if (credit && credit.used_sessions < credit.total_sessions) {
      const { data: consumed } = await supabase
        .from('user_credits')
        .update({ used_sessions: credit.used_sessions + 1 })
        .eq('id', credit.id)
        .lt('used_sessions', credit.total_sessions)
        .select('id')
        .single();
      if (consumed) creditId = consumed.id;
    }

    const { data: newBooking } = await supabase.from('bookings').insert({
      session_template_id,
      athlete_id: userId,
      coach_id: coachId,
      scheduled_at,
      end_at,
      status: 'confirmed',
      stripe_payment_id: paymentId,
      credit_id: creditId,
    }).select('id').single();

    // Send booking confirmation + coach notification
    if (newBooking) {
      const sessionDate = new Date(scheduled_at);
      const dateStr = sessionDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      const timeStr = sessionDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      const [{ data: athleteProfile }, { data: coachProfile }, { data: templateInfo }] = await Promise.all([
        supabase.from('profiles').select('email, first_name').eq('id', userId).single(),
        supabase.from('profiles').select('email, first_name').eq('id', coachId).single(),
        supabase.from('session_templates').select('title, price').eq('id', session_template_id).single(),
      ]);

      const title = templateInfo?.title || data.session_title || 'Séance';

      if (athleteProfile?.email) {
        import('@/lib/notifications').then(({ sendBookingConfirmation }) => {
          sendBookingConfirmation(athleteProfile.email, {
            athleteName: athleteProfile.first_name || 'Sportif',
            coachName: coachProfile?.first_name || 'Coach',
            sessionTitle: title,
            date: dateStr,
            time: timeStr,
            price: templateInfo?.price ? `${templateInfo.price} €` : 'Inclus',
          }).catch(console.error);
        });
      }

      if (coachProfile?.email) {
        import('@/lib/notifications').then(({ sendNewBookingCoach }) => {
          sendNewBookingCoach(coachProfile.email, {
            coachName: coachProfile.first_name || 'Coach',
            athleteName: athleteProfile?.first_name || 'Un athlète',
            sessionTitle: title,
            date: dateStr,
            time: timeStr,
          }).catch(console.error);
        });
      }
    }
  } catch (error) {
    console.error('Webhook booking creation error:', error);
  }
}

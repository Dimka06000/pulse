// Creates Stripe Checkout sessions for coaching bookings.
// Extracted from Elaubody checkout.ts — generalized for multi-coach.
// Key difference: connectedAccountId comes from the COACH's profile, not app_settings.
import { getStripeClient } from './client';
import type Stripe from 'stripe';

export type CheckoutParams = {
  sessionName: string;
  description: string | null;
  priceCents: number;
  paymentType: 'one_time' | 'subscription';
  stripePriceId: string | null;    // For subscriptions only
  customerId: string;              // Athlete's Stripe customer ID
  connectedAccountId: string | null; // Coach's Stripe Connect account (null = direct payment)
  applicationFeeCents: number;     // Pre-calculated platform fee
  userId: string;
  coachId: string;
  sessionTemplateId: string;
  bookingData?: Record<string, string>; // Slot info, passed via metadata
  origin: string;
};

export async function createCheckoutSession(params: CheckoutParams): Promise<string> {
  const stripe = getStripeClient();

  const metadata: Record<string, string> = {
    user_id: params.userId,
    coach_id: params.coachId,
    session_template_id: params.sessionTemplateId,
    payment_type: params.paymentType,
  };

  if (params.bookingData) {
    metadata.booking_data = JSON.stringify(params.bookingData);
  }

  // Verify connected account can receive charges
  let useConnect = false;
  if (params.connectedAccountId) {
    try {
      const account = await stripe.accounts.retrieve(params.connectedAccountId);
      useConnect = !!account.charges_enabled;
    } catch {
      useConnect = false;
    }
  }

  if (params.paymentType === 'subscription' && params.stripePriceId) {
    const subscriptionData: Stripe.Checkout.SessionCreateParams['subscription_data'] = {
      metadata: { user_id: params.userId, coach_id: params.coachId },
    };

    if (useConnect) {
      subscriptionData.application_fee_percent =
        (params.applicationFeeCents / params.priceCents) * 100;
      subscriptionData.transfer_data = {
        destination: params.connectedAccountId,
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: params.customerId,
      line_items: [{ price: params.stripePriceId, quantity: 1 }],
      subscription_data: subscriptionData,
      metadata,
      success_url: `${params.origin}/paiement/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${params.origin}/paiement/annule`,
    });

    return session.url!;
  }

  // One-time payment (single / pack)
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    customer: params.customerId,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: params.sessionName,
            description: params.description || undefined,
          },
          unit_amount: params.priceCents,
        },
        quantity: 1,
      },
    ],
    metadata,
    success_url: `${params.origin}/paiement/succes?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${params.origin}/paiement/annule`,
  };

  if (useConnect) {
    sessionConfig.payment_intent_data = {
      application_fee_amount: params.applicationFeeCents,
      transfer_data: { destination: params.connectedAccountId },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);
  return session.url!;
}

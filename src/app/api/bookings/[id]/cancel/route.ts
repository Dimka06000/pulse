import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { evaluateCancellation } from '@oikos/coaching';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();

  // Fetch booking
  const { data: booking } = await adminClient
    .from('bookings')
    .select('*, coach_profiles:coach_id(user_id, cancellation_deadline_hours), session_templates:session_template_id(title)')
    .eq('id', id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 });
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'Déjà annulée' }, { status: 400 });
  }

  // Determine who cancels
  const coachProfile = booking.coach_profiles as { user_id: string; cancellation_deadline_hours?: number } | null;
  const isCoach = coachProfile?.user_id === user.id;
  const isAthlete = booking.athlete_id === user.id;

  if (!isCoach && !isAthlete) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const cancelledBy = isCoach ? 'coach' as const : 'athlete' as const;
  const deadlineHours = coachProfile?.cancellation_deadline_hours ?? 24;

  const result = evaluateCancellation({
    scheduledAt: booking.scheduled_at,
    cancelledBy,
    deadlineHours,
  });

  // Update booking status
  await adminClient
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_by: cancelledBy,
    })
    .eq('id', id);

  // Restore credit if eligible
  if (result.restoreCredit && booking.credit_id) {
    // Atomic decrement
    const { data: credit } = await adminClient
      .from('user_credits')
      .select('id, used_sessions')
      .eq('id', booking.credit_id)
      .single();

    if (credit && credit.used_sessions > 0) {
      await adminClient
        .from('user_credits')
        .update({ used_sessions: credit.used_sessions - 1 })
        .eq('id', credit.id);
    }
  }

  // Stripe refund if paid via Stripe and eligible
  if (result.refundType === 'full' && booking.stripe_payment_id) {
    const { getStripeClient } = await import('@/lib/stripe/client');
    const stripe = getStripeClient();
    const { data: payment } = await adminClient
      .from('payments')
      .select('stripe_payment_intent_id')
      .eq('id', booking.stripe_payment_id)
      .single();

    if (payment?.stripe_payment_intent_id) {
      try {
        await stripe.refunds.create({
          payment_intent: payment.stripe_payment_intent_id,
        });
        await adminClient
          .from('payments')
          .update({ status: 'refunded' })
          .eq('id', booking.stripe_payment_id);
      } catch (err) {
        console.error('Stripe refund failed:', err);
      }
    }
  }

  // Send cancellation email (fire-and-forget)
  const otherPartyId = isCoach ? booking.athlete_id : coachProfile?.user_id;
  if (otherPartyId) {
    const { data: otherProfile } = await adminClient
      .from('profiles')
      .select('email, first_name')
      .eq('id', otherPartyId)
      .single();

    if (otherProfile?.email) {
      const sessionTemplates = booking.session_templates as { title?: string } | null;
      import('@/lib/notifications').then(({ sendBookingCancellation }) => {
        sendBookingCancellation(otherProfile.email, {
          recipientName: otherProfile.first_name || 'Utilisateur',
          sessionTitle: sessionTemplates?.title || 'Séance',
          date: new Date(booking.scheduled_at).toLocaleDateString('fr-FR'),
          cancelledBy,
          refundType: result.refundType,
        }).catch(console.error);
      });
    }
  }

  return NextResponse.json({
    cancelled: true,
    refund: result.refundType,
    reason: result.reason,
  });
}

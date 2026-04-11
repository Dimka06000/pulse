import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getStripeClient } from '@/lib/stripe/client';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/subscriptions/[id]/cancel — cancel at period end
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const admin = getSupabaseAdminClient();

  const { data: sub } = await admin
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!sub) return NextResponse.json({ error: 'Abonnement introuvable' }, { status: 404 });
  if (sub.status === 'cancelled') return NextResponse.json({ error: 'Déjà annulé' }, { status: 400 });

  const stripe = getStripeClient();

  try {
    // Cancel at period end (user keeps access until end of billing cycle)
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await admin
      .from('subscriptions')
      .update({ cancel_at_period_end: true })
      .eq('id', id);

    return NextResponse.json({
      message: `Abonnement annulé. Accès maintenu jusqu'au ${new Date(sub.current_period_end).toLocaleDateString('fr-FR')}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur Stripe';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

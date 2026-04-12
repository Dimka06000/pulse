import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getStripeClient } from '@/lib/stripe/client';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getSupabaseAdminClient();

  try {
    const { data, error } = await supabase
      .from('club_membership_plans')
      .select('*')
      .eq('club_id', id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err: any) {
    console.error('[GET /api/clubs/[id]/plans]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
    // Verify user is founder
    const { data: member } = await supabase
      .from('club_members')
      .select('role')
      .eq('club_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member || member.role !== 'founder') {
      return NextResponse.json({ error: 'Seul le fondateur peut créer des plans' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, price_cents, interval, includes_coaching, max_sessions_per_month } = body;

    let stripe_price_id: string | null = null;

    if (price_cents > 0) {
      // Lookup club's Stripe connected account
      const { data: club } = await supabase
        .from('clubs')
        .select('stripe_account_id')
        .eq('id', id)
        .single();

      if (!club?.stripe_account_id) {
        return NextResponse.json({ error: 'Le club n\'a pas de compte Stripe connecté' }, { status: 400 });
      }

      const stripe = getStripeClient();

      const priceParams: any = {
        unit_amount: price_cents,
        currency: 'eur',
        product_data: { name },
      };

      if (interval === 'month' || interval === 'year') {
        priceParams.recurring = { interval };
      }

      const price = await stripe.prices.create(priceParams, {
        stripeAccount: club.stripe_account_id,
      });

      stripe_price_id = price.id;
    }

    const { data: plan, error } = await supabase
      .from('club_membership_plans')
      .insert({
        club_id: id,
        name,
        description: description || null,
        price_cents,
        interval,
        includes_coaching: includes_coaching ?? false,
        max_sessions_per_month: max_sessions_per_month ?? null,
        stripe_price_id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(plan, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/clubs/[id]/plans]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

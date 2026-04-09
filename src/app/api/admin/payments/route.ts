import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '20', 10)));
  const offset = (page - 1) * limit;

  const admin = getSupabaseAdminClient();

  const { data, count, error } = await admin
    .from('payments')
    .select(
      `id, amount_cents, status, stripe_payment_intent_id, created_at,
       profile:profiles!payments_user_id_fkey(first_name, last_name, email)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    payments: data ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}

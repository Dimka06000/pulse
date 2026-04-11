import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

// GET /api/coaches/me/pricing — list coach's pricing plans
export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const admin = getSupabaseAdminClient();
  const { data: coach } = await admin.from('coach_profiles').select('id').eq('user_id', user.id).single();
  if (!coach) return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });

  const { data } = await admin
    .from('pricing_plans')
    .select('*')
    .eq('coach_id', coach.id)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false });

  return NextResponse.json(data || []);
}

// POST /api/coaches/me/pricing — create a pricing plan
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const admin = getSupabaseAdminClient();
  const { data: coach } = await admin.from('coach_profiles').select('id').eq('user_id', user.id).single();
  if (!coach) return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });

  const body = await request.json();
  const { name, description, type, price_cents, sessions_count, sessions_per_week, validity_days } = body;

  if (!name || !price_cents) return NextResponse.json({ error: 'Nom et prix requis' }, { status: 400 });

  const { data, error } = await admin
    .from('pricing_plans')
    .insert({
      coach_id: coach.id,
      name,
      description: description || '',
      type: type || 'single',
      price_cents,
      sessions_count: sessions_count || 1,
      sessions_per_week: sessions_per_week || null,
      validity_days: validity_days || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

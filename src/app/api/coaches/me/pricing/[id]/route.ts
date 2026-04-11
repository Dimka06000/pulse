import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/coaches/me/pricing/[id] — update a pricing plan
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const admin = getSupabaseAdminClient();
  const { data: coach } = await admin.from('coach_profiles').select('id').eq('user_id', user.id).single();
  if (!coach) return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });

  const body = await request.json();

  const { data, error } = await admin
    .from('pricing_plans')
    .update(body)
    .eq('id', id)
    .eq('coach_id', coach.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

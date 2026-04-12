import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> },
) {
  const { id, pid } = await params;

  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  try {
    // Only founder can manage plans
    const { data: member } = await (supabase as any)
      .from('club_members')
      .select('role')
      .eq('club_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single() as { data: { role: string } | null };

    if (!member || member.role !== 'founder') {
      return NextResponse.json(
        { error: 'Seul le fondateur peut modifier les plans' },
        { status: 403 },
      );
    }

    const body = await req.json();
    const update: Record<string, unknown> = {};

    if ('is_active' in body) update.is_active = Boolean(body.is_active);
    if ('name' in body) update.name = body.name;
    if ('description' in body) update.description = body.description;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Aucun champ valide' }, { status: 400 });
    }

    const { data: plan, error } = await (supabase as any)
      .from('club_membership_plans')
      .update(update)
      .eq('id', pid)
      .eq('club_id', id)
      .select()
      .single() as { data: any; error: any };

    if (error) throw error;
    return NextResponse.json(plan);
  } catch (err: any) {
    console.error('[PATCH /api/clubs/[id]/plans/[pid]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

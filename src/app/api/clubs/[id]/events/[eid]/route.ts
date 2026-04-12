import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const ADMIN_ROLES = ['founder', 'coach_admin', 'coach'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; eid: string }> },
) {
  const { id, eid } = await params;

  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  try {
    // Verify caller is coach+ in this club
    const { data: membership } = await (supabase as any)
      .from('club_members')
      .select('role')
      .eq('club_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle() as { data: { role: string } | null };

    if (!membership || !ADMIN_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: 'Accès refusé : droits administrateur requis' },
        { status: 403 },
      );
    }

    const body = await req.json();
    const update: Record<string, unknown> = {};

    if ('status' in body) update.status = body.status;
    if ('title' in body) update.title = body.title;
    if ('location' in body) update.location = body.location;
    if ('starts_at' in body) update.starts_at = body.starts_at;
    if ('ends_at' in body) update.ends_at = body.ends_at;
    if ('max_participants' in body) update.max_participants = body.max_participants;
    if ('is_members_only' in body) update.is_members_only = body.is_members_only;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Aucun champ valide' }, { status: 400 });
    }

    const { data: event, error } = await (supabase as any)
      .from('club_events')
      .update(update)
      .eq('id', eid)
      .eq('club_id', id)
      .select()
      .single() as { data: any; error: any };

    if (error) throw error;
    return NextResponse.json(event);
  } catch (err: any) {
    console.error('[PATCH /api/clubs/[id]/events/[eid]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

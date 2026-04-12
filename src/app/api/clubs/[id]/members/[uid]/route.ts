import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const ADMIN_ROLES = ['founder', 'coach_admin'];

async function getCallerMembership(supabase: ReturnType<typeof getSupabaseAdminClient>, clubId: string, userId: string) {
  const { data } = await supabase
    .from('club_members')
    .select('role, status')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; uid: string }> },
) {
  const { id, uid } = await params;

  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  try {
    // Verify caller is admin in this club
    const callerMembership = await getCallerMembership(supabase, id, user.id);
    if (!callerMembership || !ADMIN_ROLES.includes(callerMembership.role)) {
      return NextResponse.json({ error: 'Accès refusé : droits administrateur requis' }, { status: 403 });
    }

    const body = await req.json();
    const update: Record<string, unknown> = {};

    if ('status' in body) {
      const { status } = body;
      if (status === 'active' || status === 'suspended') {
        update.status = status;
      } else {
        return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
      }
    }

    if ('role' in body) {
      const { role } = body;
      // Only founder can promote to coach_admin
      if (role === 'coach_admin' && callerMembership.role !== 'founder') {
        return NextResponse.json(
          { error: 'Seul le fondateur peut promouvoir un administrateur' },
          { status: 403 },
        );
      }
      update.role = role;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Aucun champ valide à mettre à jour' }, { status: 400 });
    }

    const { data: member, error } = await supabase
      .from('club_members')
      .update(update)
      .eq('club_id', id)
      .eq('user_id', uid)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(member);
  } catch (err: any) {
    console.error('[PATCH /api/clubs/[id]/members/[uid]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; uid: string }> },
) {
  const { id, uid } = await params;

  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  try {
    const isSelf = uid === user.id;

    if (isSelf) {
      // Self-leave
      const { data: member, error } = await supabase
        .from('club_members')
        .update({ status: 'left' })
        .eq('club_id', id)
        .eq('user_id', uid)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(member);
    }

    // Admin kick — verify caller is admin
    const callerMembership = await getCallerMembership(supabase, id, user.id);
    if (!callerMembership || !ADMIN_ROLES.includes(callerMembership.role)) {
      return NextResponse.json({ error: 'Accès refusé : droits administrateur requis' }, { status: 403 });
    }

    // Check target is not founder
    const { data: target } = await supabase
      .from('club_members')
      .select('role')
      .eq('club_id', id)
      .eq('user_id', uid)
      .maybeSingle();

    if (!target) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });
    if (target.role === 'founder') {
      return NextResponse.json({ error: 'Impossible d\'exclure le fondateur du club' }, { status: 403 });
    }

    const { data: member, error } = await supabase
      .from('club_members')
      .update({ status: 'left' })
      .eq('club_id', id)
      .eq('user_id', uid)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(member);
  } catch (err: any) {
    console.error('[DELETE /api/clubs/[id]/members/[uid]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

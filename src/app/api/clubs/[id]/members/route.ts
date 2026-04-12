import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const ROLE_ORDER = ['founder', 'coach_admin', 'coach', 'captain', 'member'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const statusFilter = req.nextUrl.searchParams.get('status') ?? 'active';

  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  try {
    const { data, error } = await supabase
      .from('club_members')
      .select('*, profiles(first_name, last_name, avatar_url)')
      .eq('club_id', id)
      .eq('status', statusFilter);

    if (error) throw error;

    const sorted = (data ?? []).sort((a: any, b: any) => {
      const ai = ROLE_ORDER.indexOf(a.role);
      const bi = ROLE_ORDER.indexOf(b.role);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    return NextResponse.json(sorted);
  } catch (err: any) {
    console.error('[GET /api/clubs/[id]/members]', err);
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
    // Check if already a member
    const { data: existing } = await supabase
      .from('club_members')
      .select('id, status')
      .eq('club_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing && existing.status !== 'left') {
      return NextResponse.json({ error: 'Vous êtes déjà membre de ce club' }, { status: 409 });
    }

    // Lookup club join_mode
    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('join_mode')
      .eq('id', id)
      .maybeSingle();

    if (clubError) throw clubError;
    if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 });

    if (club.join_mode === 'invite') {
      return NextResponse.json({ error: 'Ce club est sur invitation uniquement' }, { status: 403 });
    }

    const status = club.join_mode === 'open' ? 'active' : 'pending';

    // Upsert to handle the case where they previously left
    const { data: member, error: upsertError } = await supabase
      .from('club_members')
      .upsert(
        {
          club_id: id,
          user_id: user.id,
          role: 'member',
          status,
        },
        { onConflict: 'club_id,user_id' },
      )
      .select()
      .single();

    if (upsertError) throw upsertError;

    const message = status === 'pending' ? 'Demande envoyée' : undefined;
    return NextResponse.json({ ...member, ...(message ? { message } : {}) }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/clubs/[id]/members]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

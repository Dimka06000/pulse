import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const COACH_ROLES = ['founder', 'coach_admin', 'coach'] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  try {
    // Verify active membership
    const { data: membership } = await supabase
      .from('club_members')
      .select('role')
      .eq('club_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Accès réservé aux membres' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('club_announcements')
      .select('*, profiles(first_name, avatar_url)')
      .eq('club_id', id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err: any) {
    console.error('[GET /api/clubs/[id]/announcements]', err);
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
    // Verify coach+ role in this club
    const { data: membership } = await supabase
      .from('club_members')
      .select('role')
      .eq('club_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', COACH_ROLES)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Réservé aux coachs et fondateurs du club' }, { status: 403 });
    }

    const body = await req.json();
    const { title, content, is_pinned } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Titre et contenu requis' }, { status: 400 });
    }

    const { data: announcement, error } = await supabase
      .from('club_announcements')
      .insert({
        club_id: id,
        author_id: user.id,
        title,
        content,
        is_pinned: is_pinned ?? false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(announcement, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/clubs/[id]/announcements]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

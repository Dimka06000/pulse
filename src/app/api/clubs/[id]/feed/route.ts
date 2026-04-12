import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(
  req: NextRequest,
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

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const offset = page * limit;

    const { data, error } = await supabase
      .from('feed_posts')
      .select('*, profiles(first_name, last_name, avatar_url), kudos(count)')
      .eq('club_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err: any) {
    console.error('[GET /api/clubs/[id]/feed]', err);
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

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
    }

    const { data: post, error } = await supabase
      .from('feed_posts')
      .insert({
        user_id: user.id,
        activity_type: 'club_post',
        club_id: id,
        description: content.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(post, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/clubs/[id]/feed]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

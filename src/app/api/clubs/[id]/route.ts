import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const ALLOWED_PATCH_FIELDS = [
  'name',
  'description',
  'logo_url',
  'banner_url',
  'sports',
  'levels',
  'city',
  'postal_code',
  'lat',
  'lng',
  'address',
  'join_mode',
] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bySlug = req.nextUrl.searchParams.get('by') === 'slug';
  const supabase = getSupabaseAdminClient();

  try {
    let query = supabase
      .from('clubs')
      .select('*, club_members(count)');

    if (bySlug) {
      query = query.eq('slug', id);
    } else {
      query = query.eq('id', id);
    }

    const { data: club, error } = await query.maybeSingle();

    if (error) throw error;
    if (!club) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 });

    const { club_members, ...rest } = club as any;
    return NextResponse.json({
      ...rest,
      member_count: club_members?.[0]?.count ?? 0,
    });
  } catch (err: any) {
    console.error('[GET /api/clubs/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  try {
    const body = await req.json();

    // Build update payload from whitelisted fields only
    const update: Record<string, unknown> = {};
    for (const field of ALLOWED_PATCH_FIELDS) {
      if (field in body) {
        update[field] = body[field];
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Aucun champ valide à mettre à jour' }, { status: 400 });
    }

    const { data: club, error } = await supabase
      .from('clubs')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(club);
  } catch (err: any) {
    console.error('[PATCH /api/clubs/[id]]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

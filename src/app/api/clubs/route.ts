import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { uniqueSlug } from '@/lib/clubs/slug';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mine = params.get('mine') === 'true';
  const sport = params.get('sport');
  const city = params.get('city');
  const q = params.get('q');
  const page = Math.max(1, Number(params.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, Number(params.get('limit') ?? '20')));
  const offset = (page - 1) * limit;

  try {
    if (mine) {
      const authClient = await getSupabaseServerClient();
      const { data: { user } } = await authClient.auth.getUser();
      if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('club_members')
        .select('role, clubs(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const clubs = (data ?? []).map((row: any) => ({
        ...row.clubs,
        my_role: row.role,
      }));

      return NextResponse.json({ clubs, page, limit });
    }

    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from('clubs')
      .select('*, club_members(count)')
      .eq('is_active', true);

    if (sport) {
      query = query.contains('sports', [sport]);
    }
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }
    if (q) {
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
    }

    const { data, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    const clubs = (data ?? []).map((club: any) => {
      const { club_members, ...rest } = club;
      return {
        ...rest,
        member_count: club_members?.[0]?.count ?? 0,
      };
    });

    return NextResponse.json({ clubs, page, limit });
  } catch (err: any) {
    console.error('[GET /api/clubs]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  try {
    // Coach-only check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || (profile.role !== 'coach' && profile.role !== 'both')) {
      return NextResponse.json(
        { error: 'Seuls les coachs peuvent créer un club' },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { name, description, logo_url, banner_url, sports, levels, city, postal_code, lat, lng, address, join_mode } = body;

    if (!name) {
      return NextResponse.json({ error: 'Le nom du club est requis' }, { status: 400 });
    }

    const slug = await uniqueSlug(name);

    const { data: club, error: insertError } = await supabase
      .from('clubs')
      .insert({
        name,
        slug,
        description,
        logo_url,
        banner_url,
        sports,
        levels,
        city,
        postal_code,
        lat,
        lng,
        address,
        join_mode,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const { error: memberError } = await supabase
      .from('club_members')
      .insert({
        club_id: club.id,
        user_id: user.id,
        role: 'founder',
        status: 'active',
      });

    if (memberError) throw memberError;

    return NextResponse.json(club, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/clubs]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

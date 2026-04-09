import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { searchCoaches, createCoachProfile } from '@oikos/coaching';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdminClient();
  const params = req.nextUrl.searchParams;

  try {
    const result = await searchCoaches(supabase, {
      sport: params.get('sport') ?? undefined,
      level: (params.get('level') as any) ?? undefined,
      priceMin: params.has('priceMin') ? Number(params.get('priceMin')) : undefined,
      priceMax: params.has('priceMax') ? Number(params.get('priceMax')) : undefined,
      lat: params.has('lat') ? Number(params.get('lat')) : undefined,
      lng: params.has('lng') ? Number(params.get('lng')) : undefined,
      radiusKm: params.has('radiusKm') ? Number(params.get('radiusKm')) : undefined,
      minRating: params.has('minRating') ? Number(params.get('minRating')) : undefined,
      sortBy: (params.get('sortBy') as any) ?? undefined,
      page: params.has('page') ? Number(params.get('page')) : 1,
      limit: params.has('limit') ? Number(params.get('limit')) : 20,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const coach = await createCoachProfile(supabase, user.id, body);
    return NextResponse.json(coach, { status: 201 });
  } catch (err: any) {
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Vous avez déjà un profil coach' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

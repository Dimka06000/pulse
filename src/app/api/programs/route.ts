import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdminClient();
  const params = req.nextUrl.searchParams;

  try {
    let query = supabase.from('training_programs').select(
      '*, coach_profiles(display_name), program_enrollments(count)'
    );

    let coachId = params.get('coach_id');
    const published = params.get('published');
    const sport = params.get('sport');
    const search = params.get('search');
    const level = params.get('level');
    const minDuration = params.get('min_duration');
    const maxDuration = params.get('max_duration');
    const minPrice = params.get('min_price');
    const maxPrice = params.get('max_price');
    const sort = params.get('sort') || 'recent';
    const limit = parseInt(params.get('limit') || '30');
    const offset = parseInt(params.get('offset') || '0');

    // Handle "mine" — resolve to actual coach profile ID
    if (coachId === 'mine') {
      const authClient = await getSupabaseServerClient();
      const { data: { user } } = await authClient.auth.getUser();
      if (user) {
        const { data: cp } = await supabase.from('coach_profiles').select('id').eq('user_id', user.id).single();
        coachId = cp?.id || null;
      } else {
        coachId = null;
      }
    }

    if (coachId) {
      query = query.eq('coach_id', coachId);
    }

    // Default to published=true for marketplace view (no coach_id filter)
    if (published === 'true' || (!coachId && published !== 'false')) {
      query = query.eq('is_published', true);
    }

    if (sport) {
      query = query.eq('sport', sport);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Event-based search: find programs mentioning an event name
    const event = params.get('event');
    if (event) {
      query = query.or(`title.ilike.%${event}%,description.ilike.%${event}%`);
    }

    if (level && level !== 'all') {
      query = query.eq('level', level);
    }

    if (minDuration) {
      query = query.gte('duration_weeks', parseInt(minDuration));
    }
    if (maxDuration) {
      query = query.lte('duration_weeks', parseInt(maxDuration));
    }

    if (minPrice !== null && minPrice !== '') {
      query = query.gte('price', parseFloat(minPrice));
    }
    if (maxPrice !== null && maxPrice !== '') {
      query = query.lte('price', parseFloat(maxPrice));
    }

    // Sort
    if (sort === 'price_asc') {
      query = query.order('price', { ascending: true });
    } else if (sort === 'price_desc') {
      query = query.order('price', { ascending: false });
    } else {
      // recent and popular both order by created_at first; popular will be re-sorted client-side
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;

    // For popular sort, sort by enrollment count
    let result = data || [];
    if (sort === 'popular') {
      result = [...result].sort((a, b) => {
        const aCount = Array.isArray(a.program_enrollments) ? a.program_enrollments[0]?.count || 0 : 0;
        const bCount = Array.isArray(b.program_enrollments) ? b.program_enrollments[0]?.count || 0 : 0;
        return bCount - aCount;
      });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  try {
    // Get coach profile
    const { data: coach, error: coachErr } = await supabase
      .from('coach_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (coachErr || !coach) {
      return NextResponse.json({ error: 'Profil coach introuvable' }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, sport, level, duration_weeks, price } = body;

    if (!title || !sport || !duration_weeks) {
      return NextResponse.json({ error: 'Champs requis: title, sport, duration_weeks' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('training_programs')
      .insert({
        coach_id: coach.id,
        title,
        description: description || '',
        sport,
        level: level || 'all',
        duration_weeks,
        price: price || 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

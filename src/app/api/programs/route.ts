import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdminClient();
  const params = req.nextUrl.searchParams;

  try {
    let query = supabase.from('training_programs').select('*, coach_profiles(display_name, avatar_url)');

    let coachId = params.get('coach_id');
    const published = params.get('published');
    const sport = params.get('sport');

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
    if (published === 'true') {
      query = query.eq('is_published', true);
    }
    if (sport) {
      query = query.eq('sport', sport);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
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

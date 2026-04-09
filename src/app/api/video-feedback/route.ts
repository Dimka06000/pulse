import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const params = req.nextUrl.searchParams;
  const role = params.get('as') || 'athlete';

  try {
    let query = supabase.from('video_feedbacks').select('*');

    if (role === 'coach') {
      // Get coach profile id
      const { data: coach } = await supabase
        .from('coach_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!coach) {
        return NextResponse.json({ error: 'Profil coach introuvable' }, { status: 404 });
      }
      query = query.eq('coach_id', coach.id);
    } else {
      query = query.eq('athlete_id', user.id);
    }

    const status = params.get('status');
    if (status) {
      query = query.eq('status', status);
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
    const body = await req.json();
    const { booking_id, video_url, coach_id, thumbnail_url, duration_seconds } = body;

    if (!video_url) {
      return NextResponse.json({ error: 'video_url requis' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('video_feedbacks')
      .insert({
        athlete_id: user.id,
        booking_id: booking_id || null,
        coach_id: coach_id || null,
        video_url,
        thumbnail_url: thumbnail_url || null,
        duration_seconds: duration_seconds || null,
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

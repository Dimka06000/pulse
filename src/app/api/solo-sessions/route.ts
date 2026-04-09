import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const db = getSupabaseAdminClient();
  const { searchParams } = new URL(req.url);
  const upcoming = searchParams.get('upcoming');
  const completed = searchParams.get('completed');
  const now = new Date().toISOString();

  let query = db
    .from('solo_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('scheduled_at', { ascending: true });

  if (upcoming === 'true') {
    query = query.gte('scheduled_at', now).eq('completed', false);
  } else if (completed === 'true') {
    query = query.eq('completed', true);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    return NextResponse.json({ error: 'Erreur de chargement' }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json();
  const { sport, title, duration_minutes, scheduled_at, notes } = body;

  if (!sport || !duration_minutes || !scheduled_at) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
  }

  const db = getSupabaseAdminClient();

  const { data, error } = await db
    .from('solo_sessions')
    .insert({
      user_id: user.id,
      sport,
      title: title || '',
      duration_minutes,
      scheduled_at,
      notes: notes || '',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erreur de création' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

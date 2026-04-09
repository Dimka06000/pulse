import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const activeOnly = req.nextUrl.searchParams.get('active') === 'true';
  const db = getSupabaseAdminClient();
  const today = new Date().toISOString().split('T')[0];

  let query = db
    .from('challenges')
    .select('*, challenge_participants(count)')
    .order('start_date', { ascending: false });

  if (activeOnly) {
    query = query.gte('end_date', today);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check if current user has joined each challenge
  const challengeIds = (data || []).map(c => c.id);
  const { data: myParticipations } = await db
    .from('challenge_participants')
    .select('challenge_id, current_value')
    .eq('user_id', user.id)
    .in('challenge_id', challengeIds);

  const myMap = new Map((myParticipations || []).map(p => [p.challenge_id, p]));

  const enriched = (data || []).map(c => ({
    ...c,
    participants_count: c.challenge_participants?.[0]?.count || 0,
    user_joined: myMap.has(c.id),
    user_value: myMap.get(c.id)?.current_value || 0,
  }));

  return NextResponse.json({ challenges: enriched });
}

export async function POST(req: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const body = await req.json();
  const { title, description, type, sport, target_value, unit, start_date, end_date } = body;

  if (!title || !type || !target_value || !unit || !start_date || !end_date) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
  }

  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from('challenges')
    .insert({
      title,
      description: description || '',
      type,
      sport: sport || null,
      target_value,
      unit,
      start_date,
      end_date,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-join creator
  await db.from('challenge_participants').insert({
    challenge_id: data.id,
    user_id: user.id,
  });

  return NextResponse.json({ challenge: data }, { status: 201 });
}

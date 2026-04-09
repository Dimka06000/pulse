import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const db = getSupabaseAdminClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let query = db
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.limit(50);

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
  const { title, type, target_value, unit, deadline } = body;

  if (!title || !type || target_value == null) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
  }

  const validTypes = ['frequency', 'performance', 'weight', 'custom'];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
  }

  const db = getSupabaseAdminClient();

  const { data, error } = await db
    .from('goals')
    .insert({
      user_id: user.id,
      title,
      type,
      target_value,
      unit: unit || '',
      deadline: deadline || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erreur de création' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const db = getSupabaseAdminClient();
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get('sport');

  let query = db
    .from('personal_records')
    .select('*')
    .eq('user_id', user.id)
    .order('achieved_at', { ascending: false });

  if (sport) {
    query = query.eq('sport', sport);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    return NextResponse.json({ error: 'Erreur de chargement' }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

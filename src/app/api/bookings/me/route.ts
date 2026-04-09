import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const db = getSupabaseAdminClient();

  const { data: bookings, error } = await db
    .from('bookings')
    .select('id, scheduled_at, end_at, status, session_templates(title, sport, duration, price)')
    .eq('athlete_id', user.id)
    .order('scheduled_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: 'Erreur de chargement' }, { status: 500 });
  }

  return NextResponse.json(bookings || []);
}

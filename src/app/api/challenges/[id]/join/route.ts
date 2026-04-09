import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const { id: challengeId } = await params;
  const db = getSupabaseAdminClient();

  // Verify challenge exists and is still active
  const { data: challenge } = await db
    .from('challenges')
    .select('id, end_date')
    .eq('id', challengeId)
    .single();

  if (!challenge) return NextResponse.json({ error: 'Challenge introuvable' }, { status: 404 });

  const today = new Date().toISOString().split('T')[0];
  if (challenge.end_date < today) {
    return NextResponse.json({ error: 'Challenge termine' }, { status: 400 });
  }

  const { data, error } = await db
    .from('challenge_participants')
    .upsert({
      challenge_id: challengeId,
      user_id: user.id,
      current_value: 0,
    }, { onConflict: 'challenge_id,user_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ participant: data });
}

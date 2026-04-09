import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const { id: challengeId } = await params;
  const db = getSupabaseAdminClient();

  const { data: challenge, error } = await db
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single();

  if (error || !challenge) return NextResponse.json({ error: 'Challenge introuvable' }, { status: 404 });

  // Leaderboard: participants sorted by current_value desc
  const { data: participants } = await db
    .from('challenge_participants')
    .select('user_id, current_value, joined_at')
    .eq('challenge_id', challengeId)
    .order('current_value', { ascending: false });

  // Enrich with user profiles
  const userIds = (participants || []).map(p => p.user_id);
  const { data: profiles } = await db
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds.length > 0 ? userIds : ['none']);

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  const leaderboard = (participants || []).map((p, idx) => {
    const profile = profileMap.get(p.user_id);
    return {
      rank: idx + 1,
      user_id: p.user_id,
      name: (profile as any)?.full_name || 'Anonyme',
      avatar_url: (profile as any)?.avatar_url || null,
      current_value: p.current_value,
      joined_at: p.joined_at,
      is_me: p.user_id === user.id,
    };
  });

  return NextResponse.json({
    challenge,
    leaderboard,
    user_joined: leaderboard.some(p => p.is_me),
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

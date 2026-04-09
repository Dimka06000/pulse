import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function GET(req: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const page = Number(req.nextUrl.searchParams.get('page') || '1');
  const limit = Number(req.nextUrl.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const db = getSupabaseAdminClient();

  const { data: posts, error } = await db
    .from('feed_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!posts || posts.length === 0) {
    return NextResponse.json({ posts: [], page, hasMore: false });
  }

  // Fetch user profiles for all post authors
  const userIds = [...new Set(posts.map(p => p.user_id))];
  const { data: profiles } = await db
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  // Fetch kudos counts + whether current user has given kudos
  const postIds = posts.map(p => p.id);
  const { data: allKudos } = await db
    .from('kudos')
    .select('post_id, user_id, emoji')
    .in('post_id', postIds);

  const kudosMap = new Map<string, { count: number; userGave: boolean; emoji: string }>();
  for (const k of (allKudos || [])) {
    const entry = kudosMap.get(k.post_id) || { count: 0, userGave: false, emoji: '👏' };
    entry.count++;
    if (k.user_id === user.id) { entry.userGave = true; entry.emoji = k.emoji; }
    kudosMap.set(k.post_id, entry);
  }

  const enriched = posts.map(p => {
    const profile = profileMap.get(p.user_id);
    const kudos = kudosMap.get(p.id) || { count: 0, userGave: false, emoji: '👏' };
    return {
      ...p,
      user: {
        name: (profile as any)?.full_name || 'Anonyme',
        avatar_url: (profile as any)?.avatar_url || null,
      },
      kudos_count: kudos.count,
      user_gave_kudos: kudos.userGave,
    };
  });

  return NextResponse.json({ posts: enriched, page, hasMore: posts.length === limit });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const { id: postId } = await params;
  const body = await req.json();
  const emoji = body.emoji || '👏';

  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from('kudos')
    .upsert({
      post_id: postId,
      user_id: user.id,
      emoji,
    }, { onConflict: 'post_id,user_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Push notification to post author (fire-and-forget)
  db.from('feed_posts').select('user_id').eq('id', postId).single().then(({ data: post }) => {
    if (post && post.user_id !== user.id) {
      db.from('profiles').select('first_name').eq('id', user.id).single().then(({ data: sender }) => {
        import('@/lib/push/send').then(({ sendPushToUser }) => {
          sendPushToUser(post.user_id, {
            title: `${sender?.first_name || 'Quelqu\'un'} vous a envoyé un kudos ${emoji}`,
            body: 'Bravo pour votre activité !',
            url: '/community',
            tag: `kudos-${postId}`,
          }).catch(console.error);
        });
      });
    }
  });

  return NextResponse.json({ kudos: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const { id: postId } = await params;
  const db = getSupabaseAdminClient();
  const { error } = await db
    .from('kudos')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

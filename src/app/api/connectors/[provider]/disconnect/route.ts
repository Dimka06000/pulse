import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const db = getSupabaseAdminClient();
  await db.from('fitness_connections')
    .update({ is_active: false, access_token: '', refresh_token: null })
    .eq('user_id', user.id)
    .eq('provider', provider);

  return NextResponse.json({ disconnected: true });
}

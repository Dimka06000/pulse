import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getStravaAuthUrl } from '@/lib/connectors/strava';
import { randomUUID } from 'crypto';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const state = `${user.id}:${randomUUID()}`;
  const url = getStravaAuthUrl(state);
  return NextResponse.redirect(url);
}

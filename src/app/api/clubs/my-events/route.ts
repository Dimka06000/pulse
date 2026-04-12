import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

// GET /api/clubs/my-events — all club events the current user is registered for
export async function GET() {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json([], { status: 200 });

  const supabase = getSupabaseAdminClient();

  try {
    const { data, error } = await supabase
      .from('club_event_participants')
      .select('event_id, status, club_events(id, title, description, event_type, sport, location, starts_at, ends_at, club_id, clubs(name, slug))')
      .eq('user_id', user.id)
      .eq('status', 'registered');

    if (error) throw error;

    const events = (data ?? []).map((row: any) => ({
      id: row.club_events?.id,
      title: row.club_events?.title,
      sport: row.club_events?.sport,
      location: row.club_events?.location,
      starts_at: row.club_events?.starts_at,
      ends_at: row.club_events?.ends_at,
      event_type: row.club_events?.event_type,
      club_name: row.club_events?.clubs?.name,
      club_slug: row.club_events?.clubs?.slug,
    }));

    return NextResponse.json(events);
  } catch (err: any) {
    console.error('[GET /api/clubs/my-events]', err);
    return NextResponse.json([]);
  }
}

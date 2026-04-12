import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  // Get coach profile
  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!coachProfile) {
    return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });
  }

  // Get distinct athletes who have bookings with this coach
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('athlete_id, scheduled_at, status')
    .eq('coach_id', coachProfile.id)
    .order('scheduled_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by athlete
  const athleteMap = new Map<string, { totalSessions: number; lastSession: string | null }>();
  for (const b of bookings ?? []) {
    const existing = athleteMap.get(b.athlete_id);
    if (existing) {
      existing.totalSessions++;
    } else {
      athleteMap.set(b.athlete_id, {
        totalSessions: 1,
        lastSession: b.scheduled_at,
      });
    }
  }

  if (athleteMap.size === 0) {
    return NextResponse.json([]);
  }

  // Fetch athlete profiles
  const athleteIds = Array.from(athleteMap.keys());
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, avatar_url')
    .in('id', athleteIds);

  const clients = (profiles ?? []).map((p) => {
    const stats = athleteMap.get(p.id)!;
    return {
      id: p.id,
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sportif',
      avatarUrl: p.avatar_url,
      lastSession: stats.lastSession,
      totalSessions: stats.totalSessions,
      trend: 'stable' as const,
      trendSentence: `${stats.totalSessions} séance${stats.totalSessions > 1 ? 's' : ''} au total`,
    };
  });

  return NextResponse.json(clients);
}

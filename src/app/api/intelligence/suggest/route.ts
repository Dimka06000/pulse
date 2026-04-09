import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { suggestWorkout } from '@/lib/intelligence/engine';

export async function GET() {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const db = getSupabaseAdminClient();
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
  const today = now.toISOString().split('T')[0];

  const [sessionsRes, journalRes, streakRes] = await Promise.all([
    db.from('solo_sessions')
      .select('sport, duration_minutes, scheduled_at')
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('scheduled_at', twoWeeksAgo.toISOString())
      .order('scheduled_at', { ascending: false }),

    db.from('journal_entries')
      .select('energy_level, sleep_hours, stress_level')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle(),

    db.from('user_streaks')
      .select('current_streak')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  // Determine favorite sports from recent sessions
  const sessions = sessionsRes.data || [];
  const sportCounts: Record<string, number> = {};
  for (const s of sessions) {
    sportCounts[s.sport] = (sportCounts[s.sport] || 0) + 1;
  }
  const favoriteSports = Object.entries(sportCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([sport]) => sport);

  const suggestion = suggestWorkout({
    recentSessions: sessions,
    journalToday: journalRes.data || null,
    streak: streakRes.data?.current_streak || 0,
    favoriteSports,
  });

  return NextResponse.json(suggestion);
}

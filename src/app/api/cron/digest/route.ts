import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { sendWeeklyDigest } from '@/lib/notifications/send';

// GET /api/cron/digest — called weekly (e.g., every Monday 8am)
// Sends weekly digest email to all active athletes
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get athletes who had activity in the last 7 days
  const { data: activeSessions } = await supabase
    .from('solo_sessions')
    .select('user_id, duration_minutes, sport')
    .eq('completed', true)
    .gte('scheduled_at', weekAgo.toISOString());

  if (!activeSessions || activeSessions.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Group by user
  const userStats = new Map<string, { count: number; minutes: number; sports: Map<string, number> }>();
  for (const s of activeSessions) {
    const existing = userStats.get(s.user_id) || { count: 0, minutes: 0, sports: new Map() };
    existing.count++;
    existing.minutes += s.duration_minutes || 0;
    if (s.sport) {
      existing.sports.set(s.sport, (existing.sports.get(s.sport) || 0) + 1);
    }
    userStats.set(s.user_id, existing);
  }

  // Get user profiles + streaks
  const userIds = Array.from(userStats.keys());
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, first_name')
    .in('id', userIds);

  const { data: streaks } = await supabase
    .from('user_streaks')
    .select('user_id, current_streak')
    .in('user_id', userIds);

  const streakMap = new Map((streaks || []).map(s => [s.user_id, s.current_streak]));

  let sent = 0;
  for (const profile of profiles || []) {
    const stats = userStats.get(profile.id);
    if (!stats || !profile.email) continue;

    // Find top sport
    let topSport = 'Sport';
    let topCount = 0;
    for (const [sport, count] of stats.sports) {
      if (count > topCount) { topSport = sport; topCount = count; }
    }

    const suggestion = stats.count >= 4
      ? 'Excellente semaine ! Pensez à inclure une séance de récupération.'
      : stats.count >= 2
        ? 'Bon rythme ! Essayez d\'ajouter une séance de plus la semaine prochaine.'
        : 'Chaque séance compte ! Fixez-vous un objectif de 3 séances cette semaine.';

    await sendWeeklyDigest(profile.email, {
      athleteName: profile.first_name || 'Sportif',
      sessionsCount: stats.count,
      totalMinutes: stats.minutes,
      streakDays: streakMap.get(profile.id) || 0,
      topSport,
      suggestion,
    }).catch(console.error);
    sent++;
  }

  return NextResponse.json({ sent });
}

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { computeWeeklyDigest } from '@/lib/intelligence/engine';

export async function GET() {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const db = getSupabaseAdminClient();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const weekStartStr = weekStart.toISOString();
  const lastWeekStartStr = lastWeekStart.toISOString();

  // Fetch all data in parallel
  const [sessionsRes, lastWeekRes, recordsRes, streakRes, journalRes] = await Promise.all([
    // This week's sessions (solo + bookings)
    db.from('solo_sessions')
      .select('sport, duration_minutes, scheduled_at, completed')
      .eq('user_id', user.id)
      .gte('scheduled_at', weekStartStr)
      .order('scheduled_at', { ascending: false }),

    // Last week's sessions
    db.from('solo_sessions')
      .select('duration_minutes')
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('scheduled_at', lastWeekStartStr)
      .lt('scheduled_at', weekStartStr),

    // Personal records
    db.from('personal_records')
      .select('sport, metric_key, value, unit, achieved_at')
      .eq('user_id', user.id)
      .gte('achieved_at', weekStartStr),

    // Streak
    db.from('user_streaks')
      .select('current_streak')
      .eq('user_id', user.id)
      .maybeSingle(),

    // Journal entries
    db.from('journal_entries')
      .select('energy_level, mood, sleep_hours')
      .eq('user_id', user.id)
      .gte('date', weekStart.toISOString().split('T')[0])
      .order('date', { ascending: false }),
  ]);

  const digest = computeWeeklyDigest({
    sessions: sessionsRes.data || [],
    lastWeekSessions: lastWeekRes.data || [],
    records: recordsRes.data || [],
    streak: streakRes.data?.current_streak || 0,
    journalEntries: journalRes.data || [],
  });

  return NextResponse.json(digest);
}

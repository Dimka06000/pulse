import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { assessInjuryRisk } from '@/lib/intelligence/engine';

export async function GET() {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const db = getSupabaseAdminClient();
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);

  const [sessionsRes, journalRes] = await Promise.all([
    db.from('solo_sessions')
      .select('duration_minutes, sport, scheduled_at')
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('scheduled_at', twoWeeksAgo.toISOString())
      .order('scheduled_at', { ascending: false }),

    db.from('journal_entries')
      .select('energy_level, stress_level, sleep_hours')
      .eq('user_id', user.id)
      .gte('date', oneWeekAgo.toISOString().split('T')[0])
      .order('date', { ascending: false }),
  ]);

  const risk = assessInjuryRisk({
    sessionsLast14Days: sessionsRes.data || [],
    journalLast7Days: journalRes.data || [],
  });

  return NextResponse.json(risk);
}

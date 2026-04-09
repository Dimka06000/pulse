import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { computeCorrelations } from '@/lib/intelligence/engine';

export async function GET() {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const db = getSupabaseAdminClient();

  const [journalRes, sessionsRes] = await Promise.all([
    db.from('journal_entries')
      .select('date, sleep_hours, sleep_quality, energy_level, stress_level, mood, alcohol, caffeine_cups')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .limit(90),

    db.from('solo_sessions')
      .select('scheduled_at, duration_minutes')
      .eq('user_id', user.id)
      .eq('completed', true)
      .order('scheduled_at', { ascending: true })
      .limit(200),
  ]);

  const entries = journalRes.data || [];
  if (entries.length < 7) {
    return NextResponse.json({ correlations: [], minEntries: 7, currentEntries: entries.length });
  }

  const correlations = computeCorrelations(entries, sessionsRes.data || []);
  return NextResponse.json({ correlations });
}

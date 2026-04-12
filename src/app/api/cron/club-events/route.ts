import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateOccurrences } from '@/lib/clubs/recurrence';

export async function GET(req: NextRequest) {
  // Auth guard — same pattern as /api/cron/reminders
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const fourWeeksFromNow = new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString();

  // Find recurring parent events that need more occurrences
  const { data: parents } = await supabase
    .from('club_events')
    .select('*')
    .not('recurrence_rule', 'is', null)
    .is('recurrence_parent_id', null)
    .eq('status', 'upcoming');

  let totalGenerated = 0;

  for (const parent of parents || []) {
    // Check if latest occurrence is within 4 weeks
    const { data: latest } = await supabase
      .from('club_events')
      .select('starts_at')
      .eq('recurrence_parent_id', parent.id)
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest || latest.starts_at < fourWeeksFromNow) {
      // Pass afterDate to avoid duplicating existing occurrences
      const afterDate = latest ? new Date(latest.starts_at) : undefined;
      const count = await generateOccurrences(parent, 8, afterDate);
      totalGenerated += count;
    }
  }

  return NextResponse.json({ generated: totalGenerated });
}

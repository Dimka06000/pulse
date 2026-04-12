import { RRule } from 'rrule';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function generateOccurrences(
  parentEvent: {
    id: string; club_id: string; title: string; description: string;
    event_type: string; sport: string | null; level: string;
    location: string | null; lat: number | null; lng: number | null;
    starts_at: string; ends_at: string | null; max_participants: number | null;
    is_members_only: boolean; created_by: string | null; recurrence_rule: string;
  },
  weeksAhead: number = 8,
  afterDate?: Date,
) {
  const supabase = getSupabaseAdminClient();
  const rule = RRule.fromString(parentEvent.recurrence_rule);
  const from = afterDate || new Date();
  const until = new Date(Date.now() + weeksAhead * 7 * 24 * 60 * 60 * 1000);
  const dates = rule.between(from, until, !afterDate);

  const parentStart = new Date(parentEvent.starts_at);
  const parentEnd = parentEvent.ends_at ? new Date(parentEvent.ends_at) : null;
  const durationMs = parentEnd ? parentEnd.getTime() - parentStart.getTime() : null;

  const rows = dates.map((date) => ({
    club_id: parentEvent.club_id,
    title: parentEvent.title,
    description: parentEvent.description,
    event_type: parentEvent.event_type,
    sport: parentEvent.sport,
    level: parentEvent.level,
    location: parentEvent.location,
    lat: parentEvent.lat,
    lng: parentEvent.lng,
    starts_at: date.toISOString(),
    ends_at: durationMs ? new Date(date.getTime() + durationMs).toISOString() : null,
    max_participants: parentEvent.max_participants,
    is_members_only: parentEvent.is_members_only,
    created_by: parentEvent.created_by,
    recurrence_parent_id: parentEvent.id,
  }));

  if (rows.length > 0) {
    await (supabase.from('club_events') as any).insert(rows);
  }
  return rows.length;
}

import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types used internally ──────────────────────────────────────────

interface ProgressDataPoint {
  date: string;
  value: number;
}

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

// ─── Session Reports ────────────────────────────────────────────────

/**
 * Create a session report. Coach fills free-text notes + optional progress metrics.
 * Simplified from Elaubody: no intensity_level, no muscle_groups, no program_type.
 * Just: coachNotes (text), athleteProgress (jsonb), nextSessionFocus (text).
 */
export async function createSessionReport(
  supabase: SupabaseClient,
  input: {
    bookingId: string;
    coachNotes: string;
    athleteProgress: Array<{ metric: string; value: number; unit: string; label: string }>;
    nextSessionFocus: string;
  }
) {
  // Verify booking exists
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('id, status, coach_id')
    .eq('id', input.bookingId)
    .single();

  if (bookingErr || !booking) {
    return { error: 'Réservation introuvable' };
  }

  // Insert report
  const { data, error } = await supabase
    .from('session_reports')
    .insert({
      booking_id: input.bookingId,
      coach_notes: input.coachNotes,
      athlete_progress: input.athleteProgress.map((p) => ({
        date: new Date().toISOString().split('T')[0],
        ...p,
      })),
      next_session_focus: input.nextSessionFocus,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Mark booking as completed
  await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .eq('id', input.bookingId);

  return { data };
}

// ─── Client List ────────────────────────────────────────────────────

/**
 * Get all clients for a coach. Returns human-language summaries.
 * Used on /clients page.
 */
export async function getCoachClients(
  supabase: SupabaseClient,
  coachId: string
) {
  // Get all unique clients from bookings for this coach
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      client_id,
      scheduled_at,
      status,
      profiles:client_id (
        id,
        first_name,
        last_name,
        avatar_url
      )
    `)
    .eq('coach_id', coachId)
    .order('scheduled_at', { ascending: false });

  if (error) return { error: error.message, data: [] };

  // Group by client
  const clientMap = new Map<string, {
    client: ClientRow;
    totalSessions: number;
    lastSession: string | null;
    completedCount: number;
  }>();

  for (const b of bookings || []) {
    const clientId = b.client_id;
    const profile = b.profiles as unknown as ClientRow;
    if (!clientMap.has(clientId)) {
      clientMap.set(clientId, {
        client: profile,
        totalSessions: 0,
        lastSession: null,
        completedCount: 0,
      });
    }
    const entry = clientMap.get(clientId)!;
    entry.totalSessions++;
    if (b.status === 'completed') entry.completedCount++;
    if (!entry.lastSession || b.scheduled_at > entry.lastSession) {
      entry.lastSession = b.scheduled_at;
    }
  }

  // Build client list items
  const clients = Array.from(clientMap.entries()).map(([id, data]) => ({
    id,
    name: [data.client.first_name, data.client.last_name].filter(Boolean).join(' ') || 'Client',
    avatarUrl: data.client.avatar_url,
    lastSession: data.lastSession,
    totalSessions: data.completedCount,
    trend: 'stable' as const,
    trendSentence: `${data.completedCount} séance${data.completedCount > 1 ? 's' : ''} réalisée${data.completedCount > 1 ? 's' : ''}`,
  }));

  return { data: clients };
}

// ─── Athlete Progress ───────────────────────────────────────────────

/**
 * Get progress data for a specific athlete. Used on /clients/[id].
 * Returns:
 * - Weight data points (for curve)
 * - Session frequency per week (for bar chart)
 * - Performance data points (for curve)
 * - Human-language summary sentences
 */
export async function getAthleteProgress(
  supabase: SupabaseClient,
  coachId: string,
  clientId: string
) {
  // 1. Get client profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, avatar_url')
    .eq('id', clientId)
    .single();

  const clientName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
    : 'Client';

  // 2. Get all session reports for this client via bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id,
      scheduled_at,
      status,
      session_reports (
        id,
        coach_notes,
        athlete_progress,
        next_session_focus,
        created_at
      )
    `)
    .eq('coach_id', coachId)
    .eq('client_id', clientId)
    .order('scheduled_at', { ascending: true });

  // 3. Extract progress data points
  const weightData: ProgressDataPoint[] = [];
  const performanceData: ProgressDataPoint[] = [];
  const allNotes: string[] = [];
  const sessionDates: string[] = [];

  for (const b of bookings || []) {
    if (b.status === 'completed') {
      sessionDates.push(b.scheduled_at);
    }
    const reports = b.session_reports as unknown as Array<{
      coach_notes: string;
      athlete_progress: Array<{ date: string; metric: string; value: number; unit: string }>;
      next_session_focus: string;
    }>;

    for (const r of reports || []) {
      if (r.coach_notes) allNotes.push(r.coach_notes);
      for (const p of r.athlete_progress || []) {
        const point = { date: p.date, value: p.value };
        if (p.metric === 'weight') weightData.push(point);
        if (p.metric === 'performance') performanceData.push(point);
      }
    }
  }

  // 4. Compute trends (human sentences)
  const weightTrend = computeWeightTrend(clientName, weightData);
  const frequencyTrend = computeFrequencyTrend(sessionDates);
  const performanceTrend = computePerformanceTrend(performanceData);

  return {
    data: {
      clientId,
      clientName,
      avatarUrl: profile?.avatar_url,
      totalSessions: sessionDates.length,
      lastSessionDate: sessionDates[sessionDates.length - 1] ?? null,
      weightData,
      performanceData,
      sessionDates,
      weightTrend,
      frequencyTrend,
      performanceTrend,
      recentNotes: allNotes.slice(-5).reverse(),
    },
  };
}

// ─── Trend Computations (exported for testing) ─────────────────────

/** Compute weight trend with human sentence */
export function computeWeightTrend(
  name: string,
  data: ProgressDataPoint[]
): { current: number; previous: number; direction: 'up' | 'down' | 'stable'; delta: number; sentence: string } | null {
  if (data.length < 2) return null;
  const current = data[data.length - 1]!.value;
  const previous = data[data.length - 2]!.value;
  const delta = current - previous;
  const direction = Math.abs(delta) < 0.1 ? 'stable' : delta > 0 ? 'up' : 'down';
  const verb = delta < 0 ? 'a perdu' : delta > 0 ? 'a pris' : 'est stable à';
  const sentence =
    direction === 'stable'
      ? `${name} est stable à ${current.toFixed(1).replace('.', ',')} kg`
      : `${name} ${verb} ${Math.abs(delta).toFixed(1).replace('.', ',')} kg`;

  return { current, previous, direction, delta, sentence };
}

/** Compute frequency trend — sessions this month vs last month */
export function computeFrequencyTrend(
  dates: string[]
): { thisMonth: number; lastMonth: number; direction: 'up' | 'down' | 'stable'; sentence: string } {
  const now = new Date();
  const thisMonth = dates.filter((d) => {
    const dt = new Date(d);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  }).length;
  const lastMonth = dates.filter((d) => {
    const dt = new Date(d);
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return dt.getMonth() === prev.getMonth() && dt.getFullYear() === prev.getFullYear();
  }).length;

  const diff = thisMonth - lastMonth;
  const direction = diff === 0 ? 'stable' : diff > 0 ? 'up' : 'down';
  let sentence = `${thisMonth} séance${thisMonth > 1 ? 's' : ''} ce mois`;
  if (diff !== 0) {
    sentence += diff > 0
      ? `, ${diff} de plus que le mois dernier`
      : `, ${Math.abs(diff)} de moins que le mois dernier`;
  }

  return { thisMonth, lastMonth, direction, sentence };
}

/** Compute performance trend — simple direction over last 4 data points */
export function computePerformanceTrend(
  data: ProgressDataPoint[]
): { direction: 'up' | 'down' | 'stable'; sentence: string } {
  if (data.length < 2) return { direction: 'stable', sentence: 'Pas encore assez de données' };

  const recent = data.slice(-4);
  let ups = 0;
  let downs = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i]!.value > recent[i - 1]!.value) ups++;
    else if (recent[i]!.value < recent[i - 1]!.value) downs++;
  }

  if (ups > downs) return { direction: 'up', sentence: 'Performance en hausse' };
  if (downs > ups) return { direction: 'down', sentence: 'Performance en baisse' };
  return { direction: 'stable', sentence: 'Performance stable' };
}

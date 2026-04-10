import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { sendSessionReminder } from '@/lib/notifications/send';

// GET /api/cron/reminders — called by Vercel Cron or external scheduler
// Sends email reminders for bookings happening in the next 24h
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);

  // Find bookings between 23h and 24h from now (1h window to avoid duplicates)
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, scheduled_at,
      athlete:profiles!bookings_athlete_id_fkey(email, first_name),
      coach:profiles!bookings_coach_id_fkey(email, first_name),
      session_templates(title)
    `)
    .eq('status', 'confirmed')
    .gte('scheduled_at', in23h.toISOString())
    .lt('scheduled_at', in24h.toISOString());

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  for (const booking of bookings) {
    const sessionDate = new Date(booking.scheduled_at);
    const dateStr = sessionDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = sessionDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const athlete = booking.athlete as { email: string; first_name: string } | null;
    const coach = booking.coach as { email: string; first_name: string } | null;
    const template = booking.session_templates as { title: string } | null;
    const sessionTitle = template?.title || 'Séance';

    if (athlete?.email) {
      await sendSessionReminder(athlete.email, {
        recipientName: athlete.first_name || 'Sportif',
        sessionTitle,
        coachName: coach?.first_name || 'votre coach',
        date: dateStr,
        time: timeStr,
      }).catch(console.error);
      sent++;
    }
  }

  return NextResponse.json({ sent });
}

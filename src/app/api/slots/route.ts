import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getCoachSlotsForDate } from '@oikos/coaching';
import { jsToIsoDay, getNowParis } from '@/lib/date-utils';

/**
 * Public endpoint — no auth required.
 * GET /api/slots?coach_id=xxx&date=YYYY-MM-DD&session_template_id=xxx
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdminClient();
  const { searchParams } = request.nextUrl;

  const coachId = searchParams.get('coach_id');
  const dateParam = searchParams.get('date');
  const sessionTemplateId = searchParams.get('session_template_id');
  const listDays = searchParams.get('list_days');

  // Mode: list available days (returns day_of_week numbers)
  if (coachId && listDays === 'true') {
    const { data: slots } = await supabase
      .from('availability_slots')
      .select('day_of_week')
      .eq('coach_id', coachId)
      .eq('is_active', true);

    const availableDays = [...new Set((slots || []).map(s => s.day_of_week))];
    return NextResponse.json({ availableDays });
  }

  if (!coachId || !dateParam || !sessionTemplateId) {
    return NextResponse.json(
      { error: 'Paramètres requis : coach_id, date, session_template_id' },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json(
      { error: 'Format de date invalide (YYYY-MM-DD requis)' },
      { status: 400 }
    );
  }

  const now = getNowParis();
  const todayStr = now.toISOString().split('T')[0];
  if (dateParam < todayStr) {
    return NextResponse.json(
      { error: 'La date ne peut pas être dans le passé' },
      { status: 400 }
    );
  }

  // Fetch session template for duration
  const { data: template, error: tplError } = await supabase
    .from('session_templates')
    .select('id, duration')
    .eq('id', sessionTemplateId)
    .eq('coach_id', coachId)
    .single();

  if (tplError || !template) {
    return NextResponse.json(
      { error: 'Type de séance invalide' },
      { status: 400 }
    );
  }

  const dateObj = new Date(dateParam + 'T12:00:00');
  const dayOfWeek = jsToIsoDay(dateObj.getDay());

  // Fetch coach's recurring availability for this day
  const { data: recurringSlots } = await supabase
    .from('availability_slots')
    .select('start_time, end_time')
    .eq('coach_id', coachId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .order('start_time');

  // Fetch date-specific overrides
  const { data: overrides } = await supabase
    .from('availability_overrides')
    .select('start_time, end_time, type')
    .eq('coach_id', coachId)
    .eq('override_date', dateParam);

  // Fetch existing confirmed bookings for this coach on this date
  const { data: bookings } = await supabase
    .from('bookings')
    .select('scheduled_at, end_at')
    .eq('coach_id', coachId)
    .gte('scheduled_at', `${dateParam}T00:00:00`)
    .lt('scheduled_at', `${dateParam}T23:59:59`)
    .eq('status', 'confirmed');

  // Convert bookings to time-only format for the engine
  const existingBookings = (bookings || []).map((b: { scheduled_at: string; end_at: string }) => ({
    start_time: new Date(b.scheduled_at).toTimeString().substring(0, 5),
    end_time: new Date(b.end_at).toTimeString().substring(0, 5),
  }));

  const slots = getCoachSlotsForDate({
    recurringSlots: recurringSlots || [],
    overrides: (overrides || []) as { start_time: string; end_time: string; type: 'add' | 'remove' }[],
    existingBookings,
    sessionDurationMinutes: template.duration,
  });

  return NextResponse.json({ date: dateParam, coachId, slots });
}

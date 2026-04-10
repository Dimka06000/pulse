import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { findAvailableCredit } from '@oikos/coaching';
import { getNowParis } from '@/lib/date-utils';

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body: {
    coach_id: string;
    session_template_id: string;
    scheduled_at: string;   // ISO timestamp
    end_at: string;         // ISO timestamp
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const { coach_id, session_template_id, scheduled_at, end_at } = body;

  if (!coach_id || !session_template_id || !scheduled_at || !end_at) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
  }

  const adminClient = getSupabaseAdminClient();

  // Validate session template
  const { data: template } = await adminClient
    .from('session_templates')
    .select('id, coach_id, price, duration')
    .eq('id', session_template_id)
    .eq('coach_id', coach_id)
    .single();

  if (!template) {
    return NextResponse.json({ error: 'Séance invalide' }, { status: 400 });
  }

  // Check booking lead time (default 24h)
  const { data: leadTimeSetting } = await adminClient
    .from('app_settings')
    .select('value')
    .eq('key', 'booking_lead_time_hours')
    .single();

  const leadTimeHours = leadTimeSetting?.value ? parseInt(leadTimeSetting.value, 10) : 24;
  const now = getNowParis();
  const sessionTime = new Date(scheduled_at);
  const diffHours = (sessionTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours < leadTimeHours) {
    return NextResponse.json(
      { error: `La réservation doit être faite au moins ${leadTimeHours}h à l'avance` },
      { status: 400 }
    );
  }

  // Check overlapping bookings
  const { data: overlapping } = await adminClient
    .from('bookings')
    .select('id')
    .eq('coach_id', coach_id)
    .eq('status', 'confirmed')
    .lt('scheduled_at', end_at)
    .gt('end_at', scheduled_at);

  if (overlapping && overlapping.length > 0) {
    return NextResponse.json(
      { error: 'Ce créneau n\'est plus disponible' },
      { status: 409 }
    );
  }

  // Try to consume a credit
  const { data: userCredits } = await adminClient
    .from('user_credits')
    .select('*')
    .eq('user_id', user.id)
    .eq('coach_id', coach_id)
    .order('expires_at', { ascending: true, nullsFirst: false });

  const availableCredit = findAvailableCredit(
    (userCredits || []).map((c: { id: string; user_id: string; coach_id: string; total_sessions: number; used_sessions: number; expires_at: string | null; session_template_id: string | null }) => ({
      id: c.id,
      user_id: c.user_id,
      coach_id: c.coach_id,
      total_sessions: c.total_sessions,
      used_sessions: c.used_sessions,
      expires_at: c.expires_at,
      session_template_id: c.session_template_id,
    })),
    coach_id,
    session_template_id
  );

  if (!availableCredit) {
    // No credits — client must go through checkout first
    return NextResponse.json(
      {
        error: 'no_credits',
        message: 'Vous n\'avez pas de crédits pour cette séance',
        redirect: `/coach/${coach_id}/book?step=payment`,
      },
      { status: 402 }
    );
  }

  // Atomic credit consumption
  const { data: consumed } = await adminClient
    .from('user_credits')
    .update({ used_sessions: availableCredit.used_sessions + 1 })
    .eq('id', availableCredit.id)
    .lt('used_sessions', availableCredit.total_sessions)
    .select('id')
    .single();

  if (!consumed) {
    return NextResponse.json(
      { error: 'Crédit indisponible, veuillez réessayer' },
      { status: 409 }
    );
  }

  // Insert booking
  const { data: booking, error: insertError } = await adminClient
    .from('bookings')
    .insert({
      session_template_id,
      athlete_id: user.id,
      coach_id,
      scheduled_at,
      end_at,
      status: 'confirmed',
      credit_id: consumed.id,
    })
    .select()
    .single();

  // Send notifications (fire-and-forget)
  if (booking) {
    const sessionDate = new Date(scheduled_at);
    const dateStr = sessionDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = sessionDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Get athlete & coach profiles for email
    const [{ data: athleteProfile }, { data: coachProfile }, { data: templateInfo }] = await Promise.all([
      adminClient.from('profiles').select('email, first_name').eq('id', user.id).single(),
      adminClient.from('profiles').select('email, first_name').eq('id', coach_id).single(),
      adminClient.from('session_templates').select('title, price').eq('id', session_template_id).single(),
    ]);

    const sessionTitle = templateInfo?.title || 'Séance';

    // Confirm to athlete
    if (athleteProfile?.email) {
      import('@/lib/notifications').then(({ sendBookingConfirmation }) => {
        sendBookingConfirmation(athleteProfile.email, {
          athleteName: athleteProfile.first_name || 'Sportif',
          coachName: coachProfile?.first_name || 'Coach',
          sessionTitle,
          date: dateStr,
          time: timeStr,
          price: templateInfo?.price ? `${templateInfo.price} €` : 'Inclus',
        }).catch(console.error);
      });
    }

    // Notify coach
    if (coachProfile?.email) {
      import('@/lib/notifications').then(({ sendNewBookingCoach }) => {
        sendNewBookingCoach(coachProfile.email, {
          coachName: coachProfile.first_name || 'Coach',
          athleteName: athleteProfile?.first_name || 'Un athlète',
          sessionTitle,
          date: dateStr,
          time: timeStr,
        }).catch(console.error);
      });
    }
  }

  if (insertError) {
    // Rollback credit on conflict
    if (insertError.code === '23P01') {
      await adminClient
        .from('user_credits')
        .update({ used_sessions: availableCredit.used_sessions })
        .eq('id', consumed.id);
      return NextResponse.json(
        { error: 'Ce créneau n\'est plus disponible' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Erreur lors de la réservation' }, { status: 500 });
  }

  return NextResponse.json(booking, { status: 201 });
}

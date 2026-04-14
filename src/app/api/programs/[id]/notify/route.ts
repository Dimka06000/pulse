import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  // Get coach profile
  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!coachProfile) {
    return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });
  }

  // Verify ownership
  const { data: program } = await supabase
    .from('training_programs')
    .select('id, coach_id')
    .eq('id', id)
    .eq('coach_id', coachProfile.id)
    .single();

  if (!program) {
    return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 });
  }

  // Count unique athletes from bookings + program_enrollments
  const [{ data: bookings }, { data: enrollments }] = await Promise.all([
    supabase
      .from('bookings')
      .select('athlete_id')
      .eq('coach_id', coachProfile.id),
    supabase
      .from('program_enrollments')
      .select('athlete_id, training_programs!inner(coach_id)')
      .eq('training_programs.coach_id', coachProfile.id)
      .neq('program_id', id),
  ]);

  const athleteIds = new Set<string>();
  for (const b of bookings ?? []) athleteIds.add(b.athlete_id);
  for (const e of enrollments ?? []) athleteIds.add(e.athlete_id);

  return NextResponse.json({ count: athleteIds.size });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  // Get coach profile
  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('id, display_name')
    .eq('user_id', user.id)
    .single();

  if (!coachProfile) {
    return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });
  }

  // Verify ownership + published
  const { data: program } = await supabase
    .from('training_programs')
    .select('id, title, is_published, coach_id')
    .eq('id', id)
    .eq('coach_id', coachProfile.id)
    .single();

  if (!program) {
    return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 });
  }

  if (!program.is_published) {
    return NextResponse.json({ error: 'Le programme doit être publié avant de notifier' }, { status: 400 });
  }

  // Get unique athletes from bookings + program_enrollments (coach's other programs)
  const [{ data: bookings }, { data: enrollments }] = await Promise.all([
    supabase
      .from('bookings')
      .select('athlete_id')
      .eq('coach_id', coachProfile.id),
    supabase
      .from('program_enrollments')
      .select('athlete_id, training_programs!inner(coach_id)')
      .eq('training_programs.coach_id', coachProfile.id)
      .neq('program_id', id),
  ]);

  const athleteIds = new Set<string>();
  for (const b of bookings ?? []) athleteIds.add(b.athlete_id);
  for (const e of enrollments ?? []) athleteIds.add(e.athlete_id);

  if (athleteIds.size === 0) {
    return NextResponse.json({ notified: 0 });
  }

  const coachName = coachProfile.display_name || 'Votre coach';
  const notifUrl = `/explore/programs/${id}`;

  // Insert in-app notifications + send push
  const notifRows = Array.from(athleteIds).map((athleteId) => ({
    user_id: athleteId,
    title: 'Nouveau programme disponible !',
    body: `${coachName} a publié : ${program.title}`,
    url: notifUrl,
  }));

  // Insert in-app notifications (best effort — table may not exist yet)
  await supabase.from('notifications').insert(notifRows).then(({ error }) => {
    if (error && error.code !== '42P01') {
      // 42P01 = relation does not exist — silently ignore if table missing
      console.error('notifications insert error:', error.message);
    }
  });

  // Send push notifications (dynamic import to avoid build-time VAPID error)
  import('@/lib/push/send').then(({ sendPushToUser }) => {
    Promise.allSettled(
      Array.from(athleteIds).map((athleteId) =>
        sendPushToUser(athleteId, {
          title: 'Nouveau programme disponible !',
          body: `${coachName} a publié : ${program.title}`,
          url: notifUrl,
          tag: `new-program-${id}`,
        }),
      ),
    );
  }).catch(() => {/* push not critical */});

  return NextResponse.json({ notified: athleteIds.size });
}

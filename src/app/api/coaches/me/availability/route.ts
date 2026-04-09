import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/** GET — fetch coach's recurring availability + overrides */
export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();

  const { data: coachProfile } = await adminClient
    .from('coach_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!coachProfile) {
    return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });
  }

  const { data: recurring } = await adminClient
    .from('availability_slots')
    .select('*')
    .eq('coach_id', coachProfile.id)
    .order('day_of_week')
    .order('start_time');

  const { data: overrides } = await adminClient
    .from('availability_overrides')
    .select('*')
    .eq('coach_id', coachProfile.id)
    .gte('override_date', new Date().toISOString().split('T')[0])
    .order('override_date');

  return NextResponse.json({ recurring: recurring || [], overrides: overrides || [] });
}

/** POST — upsert recurring availability (bulk replace for a day) */
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body: {
    day_of_week: number;
    slots: { start_time: string; end_time: string }[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  const adminClient = getSupabaseAdminClient();

  const { data: coachProfile } = await adminClient
    .from('coach_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!coachProfile) {
    return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });
  }

  // Delete existing slots for this day, then insert new ones
  await adminClient
    .from('availability_slots')
    .delete()
    .eq('coach_id', coachProfile.id)
    .eq('day_of_week', body.day_of_week);

  if (body.slots.length > 0) {
    const rows = body.slots.map((s) => ({
      coach_id: coachProfile.id,
      day_of_week: body.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
      is_active: true,
    }));

    const { error } = await adminClient
      .from('availability_slots')
      .insert(rows);

    if (error) {
      return NextResponse.json({ error: 'Erreur de sauvegarde' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

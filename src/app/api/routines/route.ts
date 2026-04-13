import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const VALID_TYPES = ['warmup', 'cooldown', 'prehab', 'mobility', 'core', 'activation'];

async function getCoachProfile(userId: string) {
  const adminClient = getSupabaseAdminClient();
  const { data } = await adminClient
    .from('coach_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();
  return data;
}

/** GET — list coach's routines, optionally filtered by type */
export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const coachProfile = await getCoachProfile(user.id);
  if (!coachProfile) {
    return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  const adminClient = getSupabaseAdminClient();
  let query = adminClient
    .from('routines')
    .select('*')
    .eq('coach_id', coachProfile.id)
    .order('created_at', { ascending: false });

  if (type) {
    query = query.eq('type', type);
  }

  const { data: routines } = await query;

  return NextResponse.json(routines || []);
}

/** POST — create a new routine */
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body: {
    title: string;
    type: string;
    exercises?: unknown;
    duration_minutes?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
  }
  if (!body.type || !VALID_TYPES.includes(body.type)) {
    return NextResponse.json({ error: `Type invalide. Valeurs acceptées : ${VALID_TYPES.join(', ')}` }, { status: 400 });
  }

  const coachProfile = await getCoachProfile(user.id);
  if (!coachProfile) {
    return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });
  }

  const adminClient = getSupabaseAdminClient();
  const { data: routine, error } = await adminClient
    .from('routines')
    .insert({
      coach_id: coachProfile.id,
      title: body.title.trim(),
      type: body.type,
      exercises: body.exercises ?? null,
      duration_minutes: body.duration_minutes ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erreur de création' }, { status: 500 });
  }

  return NextResponse.json(routine, { status: 201 });
}

/** PATCH — update a routine */
export async function PATCH(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body: {
    id: string;
    title?: string;
    type?: string;
    exercises?: unknown;
    duration_minutes?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: 'ID requis' }, { status: 400 });
  }
  if (body.type && !VALID_TYPES.includes(body.type)) {
    return NextResponse.json({ error: `Type invalide. Valeurs acceptées : ${VALID_TYPES.join(', ')}` }, { status: 400 });
  }

  const coachProfile = await getCoachProfile(user.id);
  if (!coachProfile) {
    return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });
  }

  const adminClient = getSupabaseAdminClient();

  // Verify ownership
  const { data: existing } = await adminClient
    .from('routines')
    .select('id')
    .eq('id', body.id)
    .eq('coach_id', coachProfile.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Routine non trouvée' }, { status: 404 });
  }

  const { id, ...updates } = body;
  const { data: routine, error } = await adminClient
    .from('routines')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erreur de mise à jour' }, { status: 500 });
  }

  return NextResponse.json(routine);
}

/** DELETE — delete a routine */
export async function DELETE(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const routineId = searchParams.get('id');

  if (!routineId) {
    return NextResponse.json({ error: 'ID requis' }, { status: 400 });
  }

  const coachProfile = await getCoachProfile(user.id);
  if (!coachProfile) {
    return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });
  }

  const adminClient = getSupabaseAdminClient();

  const { error } = await adminClient
    .from('routines')
    .delete()
    .eq('id', routineId)
    .eq('coach_id', coachProfile.id);

  if (error) {
    return NextResponse.json({ error: 'Erreur de suppression' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

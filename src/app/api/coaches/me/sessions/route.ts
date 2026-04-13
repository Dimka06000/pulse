import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const VALID_LEVELS = ['beginner', 'intermediate', 'advanced', 'all'];
const VALID_TYPES = ['individual', 'group', 'online'];

async function getCoachProfile(userId: string) {
  const adminClient = getSupabaseAdminClient();
  const { data } = await adminClient
    .from('coach_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();
  return data;
}

/** GET — list coach's session templates */
export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const coachProfile = await getCoachProfile(user.id);
  if (!coachProfile) {
    return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });
  }

  const adminClient = getSupabaseAdminClient();
  const { data: sessions } = await adminClient
    .from('session_templates')
    .select('*')
    .eq('coach_id', coachProfile.id)
    .order('created_at', { ascending: false });

  return NextResponse.json(sessions || []);
}

/** POST — create a new session template */
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body: {
    title: string;
    sport: string;
    description?: string;
    level: string;
    type: string;
    max_participants?: number;
    duration: number;
    price: number;
    lat?: number;
    lng?: number;
    address?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  if (!body.title?.trim() || !body.sport?.trim()) {
    return NextResponse.json({ error: 'Titre et sport requis' }, { status: 400 });
  }
  if (!VALID_LEVELS.includes(body.level)) {
    return NextResponse.json({ error: 'Niveau invalide' }, { status: 400 });
  }
  if (!VALID_TYPES.includes(body.type)) {
    return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
  }

  const coachProfile = await getCoachProfile(user.id);
  if (!coachProfile) {
    return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });
  }

  const adminClient = getSupabaseAdminClient();
  const { data: session, error } = await adminClient
    .from('session_templates')
    .insert({
      coach_id: coachProfile.id,
      title: body.title.trim(),
      sport: body.sport.trim(),
      description: body.description?.trim() || '',
      level: body.level,
      type: body.type,
      max_participants: body.max_participants || 1,
      duration: body.duration || 60,
      price: body.price ?? 0,
      lat: body.lat || null,
      lng: body.lng || null,
      address: body.address || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erreur de création' }, { status: 500 });
  }

  return NextResponse.json(session, { status: 201 });
}

/** PATCH — update a session template */
export async function PATCH(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body: {
    id: string;
    title?: string;
    sport?: string;
    description?: string;
    level?: string;
    type?: string;
    max_participants?: number;
    duration?: number;
    price?: number;
    is_active?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: 'ID requis' }, { status: 400 });
  }
  if (body.level && !VALID_LEVELS.includes(body.level)) {
    return NextResponse.json({ error: 'Niveau invalide' }, { status: 400 });
  }
  if (body.type && !VALID_TYPES.includes(body.type)) {
    return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
  }

  const coachProfile = await getCoachProfile(user.id);
  if (!coachProfile) {
    return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });
  }

  const adminClient = getSupabaseAdminClient();

  // Verify ownership
  const { data: existing } = await adminClient
    .from('session_templates')
    .select('id')
    .eq('id', body.id)
    .eq('coach_id', coachProfile.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Séance non trouvée' }, { status: 404 });
  }

  const { id, ...updates } = body;
  const { data: session, error } = await adminClient
    .from('session_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erreur de mise à jour' }, { status: 500 });
  }

  return NextResponse.json(session);
}

/** DELETE — delete a session template */
export async function DELETE(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('id');

  if (!sessionId) {
    return NextResponse.json({ error: 'ID requis' }, { status: 400 });
  }

  const coachProfile = await getCoachProfile(user.id);
  if (!coachProfile) {
    return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });
  }

  const adminClient = getSupabaseAdminClient();

  const { error } = await adminClient
    .from('session_templates')
    .delete()
    .eq('id', sessionId)
    .eq('coach_id', coachProfile.id);

  if (error) {
    return NextResponse.json({ error: 'Erreur de suppression' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/** GET — list coach's session templates */
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
    description: string;
    level: string;
    type: string;
    max_participants: number;
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

  const adminClient = getSupabaseAdminClient();

  const { data: coachProfile } = await adminClient
    .from('coach_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!coachProfile) {
    return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });
  }

  const { data: session, error } = await adminClient
    .from('session_templates')
    .insert({
      coach_id: coachProfile.id,
      title: body.title,
      sport: body.sport,
      description: body.description,
      level: body.level,
      type: body.type,
      max_participants: body.max_participants || 1,
      duration: body.duration,
      price: body.price,
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

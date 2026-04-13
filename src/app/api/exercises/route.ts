import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

async function getCoachProfile(userId: string) {
  const adminClient = getSupabaseAdminClient();
  const { data } = await adminClient
    .from('coach_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();
  return data;
}

/** GET — list exercises (global + coach custom if coach_id provided) */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport');
  const coachId = searchParams.get('coach_id');

  const adminClient = getSupabaseAdminClient();

  let query = adminClient
    .from('exercises')
    .select('*')
    .order('name', { ascending: true });

  if (sport) {
    query = query.eq('sport', sport);
  }

  if (coachId) {
    // Global exercises OR this coach's custom exercises
    query = query.or(`is_custom.eq.false,and(is_custom.eq.true,coach_id.eq.${coachId})`);
  } else {
    query = query.eq('is_custom', false);
  }

  const { data: exercises, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Erreur de récupération' }, { status: 500 });
  }

  return NextResponse.json(exercises || []);
}

/** POST — create a custom exercise */
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body: {
    name: string;
    sport: string;
    category: string;
    name_en?: string;
    muscle_engagement?: Record<string, number>;
    tendon_stress?: Record<string, number>;
    joint_impact?: Record<string, number>;
    default_duration?: number;
    default_rpe?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  if (!body.name?.trim() || !body.sport?.trim() || !body.category?.trim()) {
    return NextResponse.json({ error: 'Nom, sport et catégorie requis' }, { status: 400 });
  }

  const coachProfile = await getCoachProfile(user.id);
  if (!coachProfile) {
    return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });
  }

  const adminClient = getSupabaseAdminClient();
  const { data: exercise, error } = await adminClient
    .from('exercises')
    .insert({
      name: body.name.trim(),
      sport: body.sport.trim(),
      category: body.category.trim(),
      name_en: body.name_en?.trim() || null,
      muscle_engagement: body.muscle_engagement || null,
      tendon_stress: body.tendon_stress || null,
      joint_impact: body.joint_impact || null,
      default_duration: body.default_duration || null,
      default_rpe: body.default_rpe || null,
      is_custom: true,
      coach_id: coachProfile.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erreur de création' }, { status: 500 });
  }

  return NextResponse.json(exercise, { status: 201 });
}

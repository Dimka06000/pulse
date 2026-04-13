import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/** GET — fetch current user's cycle tracking data */
export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient
    .from('cycle_tracking')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found — expected when user has no data yet
    return NextResponse.json({ error: 'Erreur de récupération' }, { status: 500 });
  }

  return NextResponse.json(data ?? null);
}

/** POST — upsert cycle tracking data */
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  let body: {
    last_period_date: string;
    avg_cycle_days?: number;
    avg_period_days?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  if (!body.last_period_date) {
    return NextResponse.json({ error: 'last_period_date requis' }, { status: 400 });
  }

  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient
    .from('cycle_tracking')
    .upsert(
      {
        user_id: user.id,
        last_period_date: body.last_period_date,
        avg_cycle_days: body.avg_cycle_days ?? 28,
        avg_period_days: body.avg_period_days ?? 5,
        consent_given_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erreur de sauvegarde' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/** DELETE — remove cycle tracking data */
export async function DELETE() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  const { error } = await adminClient
    .from('cycle_tracking')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Erreur de suppression' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

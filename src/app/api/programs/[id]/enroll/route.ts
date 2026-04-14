import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  try {
    const { data, error } = await supabase
      .from('program_enrollments')
      .select('*')
      .eq('program_id', id)
      .eq('athlete_id', user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ enrolled: false }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  try {
    // Check program exists and is published
    const { data: program } = await supabase
      .from('training_programs')
      .select('id, is_published, price, coach_profiles(user_id)')
      .eq('id', id)
      .single();

    if (!program) {
      return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 });
    }

    if (!program.is_published) {
      return NextResponse.json({ error: 'Ce programme n\'est pas disponible' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const athleteId = body.athlete_id || user.id;

    // If assigning another athlete, must be the coach
    const coachProfile = program.coach_profiles as unknown as { user_id: string } | null;
    if (body.athlete_id && coachProfile?.user_id !== user.id) {
      return NextResponse.json({ error: 'Seul le coach peut assigner un athlète' }, { status: 403 });
    }

    // Check not already enrolled
    const { data: existing } = await supabase
      .from('program_enrollments')
      .select('id')
      .eq('program_id', id)
      .eq('athlete_id', athleteId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Déjà inscrit à ce programme' }, { status: 409 });
    }

    // Insert enrollment
    // TODO: For paid programs, integrate Stripe checkout before inserting
    const { data, error } = await supabase
      .from('program_enrollments')
      .insert({
        program_id: id,
        athlete_id: athleteId,
        assigned_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Déjà inscrit à ce programme' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  try {
    const { error } = await supabase
      .from('program_enrollments')
      .delete()
      .eq('program_id', id)
      .eq('athlete_id', user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

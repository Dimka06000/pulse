import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  try {
    // Check program exists
    const { data: program } = await supabase
      .from('training_programs')
      .select('id, coach_profiles(user_id)')
      .eq('id', id)
      .single();

    if (!program) {
      return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 });
    }

    const body = await req.json();
    const athleteId = body.athlete_id || user.id; // self-enroll if no athlete_id

    // If assigning another athlete, must be the coach
    const coachProfile = program.coach_profiles as unknown as { user_id: string } | null;
    if (body.athlete_id && coachProfile?.user_id !== user.id) {
      return NextResponse.json({ error: 'Seul le coach peut assigner un athlète' }, { status: 403 });
    }

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

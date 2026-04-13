import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type Ctx = { params: Promise<{ id: string }> };

async function verifyOwnership(programId: string, userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data: program } = await supabase
    .from('training_programs')
    .select('id, coach_profiles(user_id)')
    .eq('id', programId)
    .single();

  if (!program) return { ok: false, status: 404, error: 'Programme introuvable' };

  const coachProfile = program.coach_profiles as unknown as { user_id: string } | null;
  if (coachProfile?.user_id !== userId) return { ok: false, status: 403, error: 'Non autorisé' };

  return { ok: true };
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const supabase = getSupabaseAdminClient();

  try {
    const { data, error } = await supabase
      .from('program_blocks')
      .select('*')
      .eq('program_id', id)
      .order('order_index');

    if (error) throw error;

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
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const ownership = await verifyOwnership(id, user.id);
  if (!ownership.ok) return NextResponse.json({ error: ownership.error }, { status: ownership.status });

  const supabase = getSupabaseAdminClient();

  try {
    const body = await req.json();
    const { title, phase, week_start, week_end, focus, progression_curve, order_index } = body;

    if (!title || !phase || week_start === undefined || week_end === undefined) {
      return NextResponse.json(
        { error: 'Champs requis: title, phase, week_start, week_end' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('program_blocks')
      .insert({
        program_id: id,
        title,
        phase,
        week_start,
        week_end,
        focus: focus || null,
        progression_curve: progression_curve || null,
        order_index: order_index ?? 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const ownership = await verifyOwnership(id, user.id);
  if (!ownership.ok) return NextResponse.json({ error: ownership.error }, { status: ownership.status });

  const supabase = getSupabaseAdminClient();

  try {
    const body = await req.json();
    const { block_id, title, phase, week_start, week_end, focus, progression_curve, order_index } = body;

    if (!block_id) {
      return NextResponse.json({ error: 'block_id requis' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (phase !== undefined) updates.phase = phase;
    if (week_start !== undefined) updates.week_start = week_start;
    if (week_end !== undefined) updates.week_end = week_end;
    if (focus !== undefined) updates.focus = focus;
    if (progression_curve !== undefined) updates.progression_curve = progression_curve;
    if (order_index !== undefined) updates.order_index = order_index;

    const { data, error } = await supabase
      .from('program_blocks')
      .update(updates)
      .eq('id', block_id)
      .eq('program_id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const ownership = await verifyOwnership(id, user.id);
  if (!ownership.ok) return NextResponse.json({ error: ownership.error }, { status: ownership.status });

  const supabase = getSupabaseAdminClient();

  try {
    const blockId = req.nextUrl.searchParams.get('block_id');
    if (!blockId) {
      return NextResponse.json({ error: 'block_id requis' }, { status: 400 });
    }

    const { error } = await supabase
      .from('program_blocks')
      .delete()
      .eq('id', blockId)
      .eq('program_id', id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

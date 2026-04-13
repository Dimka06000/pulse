import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type Ctx = { params: Promise<{ id: string }> };

const VALID_TRIGGERS = [
  'before_session',
  'every_nth_week',
  'tsb_threshold',
  'cycle_phase',
  'after_race',
  'always',
] as const;

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
      .from('program_rules')
      .select('*')
      .eq('program_id', id)
      .order('created_at');

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
    const { title, trigger, condition, action } = body;

    if (!title || !trigger || !condition || !action) {
      return NextResponse.json(
        { error: 'Champs requis: title, trigger, condition, action' },
        { status: 400 }
      );
    }

    if (!VALID_TRIGGERS.includes(trigger)) {
      return NextResponse.json(
        { error: `trigger invalide. Valeurs acceptées: ${VALID_TRIGGERS.join(', ')}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('program_rules')
      .insert({
        program_id: id,
        title,
        trigger,
        condition,
        action,
        is_active: true,
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
    const { rule_id, title, trigger, condition, action, is_active } = body;

    if (!rule_id) {
      return NextResponse.json({ error: 'rule_id requis' }, { status: 400 });
    }

    if (trigger !== undefined && !VALID_TRIGGERS.includes(trigger)) {
      return NextResponse.json(
        { error: `trigger invalide. Valeurs acceptées: ${VALID_TRIGGERS.join(', ')}` },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (trigger !== undefined) updates.trigger = trigger;
    if (condition !== undefined) updates.condition = condition;
    if (action !== undefined) updates.action = action;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabase
      .from('program_rules')
      .update(updates)
      .eq('id', rule_id)
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
    const ruleId = req.nextUrl.searchParams.get('rule_id');
    if (!ruleId) {
      return NextResponse.json({ error: 'rule_id requis' }, { status: 400 });
    }

    const { error } = await supabase
      .from('program_rules')
      .delete()
      .eq('id', ruleId)
      .eq('program_id', id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

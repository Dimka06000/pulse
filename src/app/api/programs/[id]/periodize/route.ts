import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { generatePeriodization, PeriodizationInput, GeneratedBlock } from '@/lib/training/periodization';

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
    // Verify coach owns the program
    const { data: program } = await supabase
      .from('training_programs')
      .select('id, coach_profiles(user_id)')
      .eq('id', id)
      .single();

    if (!program) {
      return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 });
    }

    const coachProfile = program.coach_profiles as unknown as { user_id: string } | null;
    if (coachProfile?.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Parse and validate body
    const body = await req.json();
    const { startDate, eventDate, sport, athleteLevel } = body as {
      startDate?: string;
      eventDate?: string;
      sport?: string;
      athleteLevel?: PeriodizationInput['athleteLevel'];
    };

    if (!startDate || !eventDate || !sport || !athleteLevel) {
      return NextResponse.json(
        { error: 'Champs requis: startDate, eventDate, sport, athleteLevel' },
        { status: 400 },
      );
    }

    const validLevels: PeriodizationInput['athleteLevel'][] = ['beginner', 'intermediate', 'advanced'];
    if (!validLevels.includes(athleteLevel)) {
      return NextResponse.json(
        { error: 'athleteLevel doit être: beginner, intermediate ou advanced' },
        { status: 400 },
      );
    }

    // Generate periodization blocks
    const input: PeriodizationInput = { startDate, eventDate, sport, athleteLevel };
    const blocks: GeneratedBlock[] = generatePeriodization(input);

    // Delete existing program_blocks for a clean slate
    const { error: deleteError } = await supabase
      .from('program_blocks')
      .delete()
      .eq('program_id', id);

    if (deleteError) throw deleteError;

    // Insert new blocks
    const rows = blocks.map((block, index) => ({
      program_id: id,
      title: block.title,
      phase: block.phase,
      focus: block.focus,
      week_start: block.weekStart,
      week_end: block.weekEnd,
      progression_curve: block.progressionCurve,
      order_index: index,
    }));

    const { data: insertedBlocks, error: insertError } = await supabase
      .from('program_blocks')
      .insert(rows)
      .select();

    if (insertError) throw insertError;

    // Update program duration_weeks = max weekEnd across all blocks
    const maxWeekEnd = Math.max(...blocks.map((b) => b.weekEnd));
    const { error: updateError } = await supabase
      .from('training_programs')
      .update({ duration_weeks: maxWeekEnd })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json(insertedBlocks, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

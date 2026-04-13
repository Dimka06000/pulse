import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateProgram } from '@/lib/training/program-generator';

type Ctx = { params: Promise<{ id: string }> };

type AthleteLevel = 'beginner' | 'intermediate' | 'advanced';

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
      .select('id, sport, duration_weeks, target_event_id, coach_profiles(user_id, id)')
      .eq('id', id)
      .single();

    if (!program) {
      return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 });
    }

    const coachProfile = program.coach_profiles as unknown as { user_id: string; id: string } | null;
    if (coachProfile?.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await req.json();
    const { athleteLevel, athleteProfile } = body as {
      athleteLevel: AthleteLevel;
      athleteProfile?: { currentVolumeMinPerWeek?: number; injuries?: string[] };
    };

    if (!athleteLevel || !['beginner', 'intermediate', 'advanced'].includes(athleteLevel)) {
      return NextResponse.json(
        { error: 'Champ requis: athleteLevel (beginner | intermediate | advanced)' },
        { status: 400 }
      );
    }

    // Fetch program blocks
    const { data: blocks } = await supabase
      .from('program_blocks')
      .select('*')
      .eq('program_id', id)
      .order('week_start');

    // Fetch target event if linked
    let targetEvent = null;
    if (program.target_event_id) {
      const { data } = await supabase
        .from('target_events')
        .select('*')
        .eq('id', program.target_event_id)
        .single();
      targetEvent = data;
    }

    // Fetch exercise catalog (global + coach custom)
    const { data: exercises } = await supabase
      .from('exercises')
      .select('*')
      .or(`coach_id.is.null,coach_id.eq.${coachProfile?.id}`);

    // Call generateProgram with all data
    const generatedWorkouts = await generateProgram({
      program: {
        id,
        sport: program.sport,
        duration_weeks: program.duration_weeks,
      },
      blocks: blocks ?? [],
      targetEvent,
      exercises: exercises ?? [],
      athleteLevel,
      athleteProfile: athleteProfile ?? {},
    });

    // Delete existing program_workouts (clean slate)
    await supabase
      .from('program_workouts')
      .delete()
      .eq('program_id', id);

    // Insert all generated workouts
    const workoutsToInsert = generatedWorkouts.map((workout) => {
      // Find matching block where week_number is between block.week_start and block.week_end
      const matchingBlock = (blocks ?? []).find(
        (block) =>
          workout.week_number >= block.week_start &&
          workout.week_number <= block.week_end
      );

      return {
        program_id: id,
        week_number: workout.week_number,
        day_number: workout.day_number,
        title: workout.title,
        description: workout.description ?? '',
        duration_minutes: workout.duration_minutes,
        workout_data: { exercises: workout.exercises },
        intensity_percent: workout.intensity_percent,
        block_id: matchingBlock?.id ?? null,
      };
    });

    if (workoutsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('program_workouts')
        .insert(workoutsToInsert);

      if (insertError) throw insertError;
    }

    return NextResponse.json({
      count: generatedWorkouts.length,
      message: 'Programme généré avec succès',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

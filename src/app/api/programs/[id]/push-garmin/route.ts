import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatWorkoutForGarmin } from '@/lib/connectors/garmin-push';
import { pushProgramToGarmin } from '@/lib/connectors/garmin-training-api';

type Ctx = { params: Promise<{ id: string }> };

/* eslint-disable @typescript-eslint/no-explicit-any */

// POST /api/programs/[id]/push-garmin — push all program workouts to Garmin watch
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id: programId } = await ctx.params;
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const admin = getSupabaseAdminClient();

  // Check Garmin is connected
  const { data: garminConn } = await admin
    .from('fitness_connections')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'garmin')
    .eq('is_active', true)
    .maybeSingle();

  if (!garminConn) {
    return NextResponse.json({ error: 'Connectez votre Garmin d\'abord' }, { status: 400 });
  }

  // Get program with workouts
  const { data: program } = await admin
    .from('training_programs')
    .select('id, title, sport, duration_weeks')
    .eq('id', programId)
    .single();

  if (!program) {
    return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 });
  }

  // Get program workouts
  const { data: workouts } = await admin
    .from('program_workouts')
    .select('*')
    .eq('program_id', programId)
    .order('week_number', { ascending: true })
    .order('day_of_week', { ascending: true });

  if (!workouts || workouts.length === 0) {
    return NextResponse.json({ error: 'Aucune séance dans ce programme' }, { status: 400 });
  }

  // Convert workouts to Garmin format with scheduled dates
  const today = new Date();
  const garminWorkouts = workouts.map((w: any) => {
    // Calculate scheduled date: today + (week-1)*7 + day_of_week
    const dayOffset = ((w.week_number || 1) - 1) * 7 + (w.day_of_week || 0);
    const scheduledDate = new Date(today);
    scheduledDate.setDate(today.getDate() + dayOffset);
    const dateStr = scheduledDate.toISOString().split('T')[0];

    const garminWorkout = formatWorkoutForGarmin(
      w.title || `Séance S${w.week_number}J${w.day_of_week}`,
      program.sport || 'fitness',
      w.workout_data || {},
    );

    return { workout: garminWorkout, scheduledDate: dateStr };
  });

  // Push to Garmin
  const result = await pushProgramToGarmin(user.id, garminWorkouts);

  if (result.success) {
    return NextResponse.json({
      message: `${result.pushed} séances envoyées sur votre Garmin`,
      pushed: result.pushed,
    });
  }

  return NextResponse.json({
    message: `${result.pushed} séances envoyées, ${result.errors.length} erreurs`,
    pushed: result.pushed,
    errors: result.errors,
  }, { status: result.pushed > 0 ? 200 : 500 });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateICS, type CalendarEvent } from '@/lib/training/ics-generator';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  // Auth required
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  // Fetch program + workouts
  const { data: program, error } = await supabase
    .from('training_programs')
    .select('*, program_workouts(*)')
    .eq('id', id)
    .single();

  if (error || !program) {
    return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 });
  }

  // Determine start date: query param or today
  const url = new URL(req.url);
  const startParam = url.searchParams.get('start_date');
  const startDate = startParam ? new Date(startParam) : new Date();
  // Normalize to 08:00 AM local time (keep date, set time to 08:00 UTC for simplicity)
  startDate.setHours(8, 0, 0, 0);

  const workouts: Array<{
    id: string;
    week_number: number;
    day_number: number;
    title: string;
    description: string;
    duration_minutes: number;
    workout_data?: { exercises?: Array<{ name?: string; sets?: number; reps?: number; duration_minutes?: number }> };
  }> = program.program_workouts || [];

  const events: CalendarEvent[] = workouts.map((workout) => {
    // Calculate absolute date: startDate + (week-1)*7 + (day-1) days
    const dayOffset = (workout.week_number - 1) * 7 + (workout.day_number - 1);
    const eventDate = new Date(startDate);
    eventDate.setDate(eventDate.getDate() + dayOffset);

    // Build description from exercise list
    const exercises = workout.workout_data?.exercises || [];
    const exerciseLines = exercises.map((ex) => {
      const parts: string[] = [];
      if (ex.name) parts.push(ex.name);
      if (ex.sets && ex.reps) parts.push(`${ex.sets}x${ex.reps}`);
      else if (ex.duration_minutes) parts.push(`${ex.duration_minutes} min`);
      return parts.join(' — ');
    });

    const duration = workout.duration_minutes || 60;
    const descParts: string[] = [];
    if (workout.description) descParts.push(workout.description);
    descParts.push(`Durée : ${duration} min`);
    if (exerciseLines.length > 0) {
      descParts.push('Exercices :', ...exerciseLines.map((l) => `• ${l}`));
    }

    return {
      title: workout.title,
      description: descParts.join('\n'),
      startDate: eventDate,
      durationMinutes: duration,
    };
  });

  // Sort by date
  events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const icsContent = generateICS(events, program.title || 'Programme');

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="programme.ics"`,
      'Cache-Control': 'no-cache',
    },
  });
}

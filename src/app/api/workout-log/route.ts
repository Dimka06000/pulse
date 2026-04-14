import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const body = await req.json();
  const {
    workoutId,
    duration_seconds,
    exercises_completed,
    sets_completed,
    started_at,
    completed_at,
  } = body;

  const db = getSupabaseAdminClient();

  try {
    // Log as a solo session
    const { data, error } = await db
      .from('solo_sessions')
      .insert({
        user_id: user.id,
        sport: 'musculation',
        title: body.title || 'Seance terminee',
        duration_minutes: Math.round(duration_seconds / 60),
        scheduled_at: started_at || new Date().toISOString(),
        completed: true,
        completed_at: completed_at || new Date().toISOString(),
        notes: `${exercises_completed} exercices, ${sets_completed} series`,
      })
      .select()
      .single();

    if (error) {
      console.error('workout-log insert error:', error);
      return NextResponse.json({ error: 'Erreur d\'enregistrement' }, { status: 500 });
    }

    // If linked to a program workout, mark it as completed
    if (workoutId && workoutId !== 'solo') {
      await db
        .from('program_workouts')
        .update({ status: 'completed', completed_at: completed_at || new Date().toISOString() })
        .eq('id', workoutId);
    }

    return NextResponse.json({ success: true, session: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

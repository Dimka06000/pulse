import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  try {
    const { data, error } = await supabase
      .from('program_enrollments')
      .select(`
        *,
        training_programs (
          id, title, description, sport, level, duration_weeks,
          price, cover_image_url, is_published,
          coach_profiles (display_name, avatar_url),
          program_workouts (id, week_number, day_number, title)
        )
      `)
      .eq('athlete_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

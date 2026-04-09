import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getTrainingCourses, getCoachPathway } from '@oikos/coaching/training';

export async function GET() {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!coachProfile) {
    return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });
  }

  const [coursesResult, pathwayResult] = await Promise.all([
    getTrainingCourses(supabase, coachProfile.id),
    getCoachPathway(supabase, coachProfile.id),
  ]);

  return NextResponse.json({
    courses: coursesResult.data,
    pathway: pathwayResult.data,
  });
}

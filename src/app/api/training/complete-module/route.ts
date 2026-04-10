import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { completeModule } from '@oikos/coaching/training';

export async function POST(request: NextRequest) {
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

  const { courseId, moduleId } = await request.json();
  if (!courseId || !moduleId) {
    return NextResponse.json({ error: 'courseId et moduleId requis' }, { status: 400 });
  }

  const result = await completeModule(supabase, coachProfile.id, courseId, moduleId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data);
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  try {
    // Verify coach owns this video feedback
    const { data: video } = await supabase
      .from('video_feedbacks')
      .select('id, coach_id, coach_profiles(user_id)')
      .eq('id', id)
      .single();

    if (!video) {
      return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 });
    }

    const coachProfile = video.coach_profiles as unknown as { user_id: string } | null;
    if (coachProfile?.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await req.json();
    const { coach_comment, coach_timestamps } = body;

    const { data, error } = await supabase
      .from('video_feedbacks')
      .update({
        coach_comment: coach_comment || null,
        coach_timestamps: coach_timestamps || [],
        status: 'reviewed',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

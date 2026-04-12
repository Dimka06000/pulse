import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const supabase = getSupabaseAdminClient() as any;

  try {
    // Verify caller is an active member of the club
    const { data: membership } = await supabase
      .from('club_members')
      .select('id')
      .eq('club_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle() as { data: { id: string } | null };

    if (!membership) {
      return NextResponse.json(
        { error: 'Vous devez être membre du club pour accéder aux séances' },
        { status: 403 },
      );
    }

    // Get coach user IDs that are active coaches/admins/founders in this club
    const { data: coachMembers, error: membersError } = await supabase
      .from('club_members')
      .select('user_id')
      .eq('club_id', id)
      .eq('status', 'active')
      .in('role', ['founder', 'coach_admin', 'coach']) as { data: { user_id: string }[] | null; error: any };

    if (membersError) throw membersError;

    const coachUserIds = (coachMembers ?? []).map((m) => m.user_id);

    if (coachUserIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get coach_profiles for those user IDs
    const { data: coachProfiles, error: profilesError } = await supabase
      .from('coach_profiles')
      .select('id, user_id, profiles(first_name, last_name)')
      .in('user_id', coachUserIds) as { data: { id: string; user_id: string; profiles: { first_name: string | null; last_name: string | null } | null }[] | null; error: any };

    if (profilesError) throw profilesError;

    const coachProfileIds = (coachProfiles ?? []).map((cp) => cp.id);

    if (coachProfileIds.length === 0) {
      return NextResponse.json([]);
    }

    // Build a map of coach_profile.id → coach name
    const coachNameById: Record<string, string> = {};
    for (const cp of coachProfiles ?? []) {
      const profile = cp.profiles;
      coachNameById[cp.id] = profile
        ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
        : 'Coach';
    }

    // Fetch session templates for those coaches
    const { data: templates, error: templatesError } = await supabase
      .from('session_templates')
      .select('*')
      .in('coach_id', coachProfileIds) as { data: any[] | null; error: any };

    if (templatesError) throw templatesError;

    const result = (templates ?? []).map((t: any) => ({
      ...t,
      coach_name: coachNameById[t.coach_id] ?? 'Coach',
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[GET /api/clubs/[id]/sessions]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

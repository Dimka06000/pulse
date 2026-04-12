import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateOccurrences } from '@/lib/clubs/recurrence';

const COACH_ROLES = ['founder', 'coach_admin', 'coach'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  const supabase = getSupabaseAdminClient();

  try {
    const { data: events, error } = await supabase
      .from('club_events')
      .select('*, club_event_participants(count)')
      .eq('club_id', id)
      .eq('status', 'upcoming')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true });

    if (error) throw error;

    // For each event, build participant_count + is_registered for current user
    const result = await Promise.all(
      (events ?? []).map(async (event: any) => {
        const { club_event_participants, ...rest } = event;
        const participantCount = club_event_participants?.[0]?.count ?? 0;

        let isRegistered = false;
        if (user) {
          const { data: reg } = await supabase
            .from('club_event_participants')
            .select('id')
            .eq('event_id', event.id)
            .eq('user_id', user.id)
            .eq('status', 'registered')
            .maybeSingle();
          isRegistered = !!reg;
        }

        return {
          ...rest,
          participant_count: participantCount,
          is_registered: isRegistered,
        };
      }),
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[GET /api/clubs/[id]/events]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  try {
    // Verify user is coach+ in this club
    const { data: membership } = await (supabase as any)
      .from('club_members')
      .select('role')
      .eq('club_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle() as { data: { role: string } | null };

    if (!membership || !COACH_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: 'Vous devez être coach ou administrateur du club pour créer un événement' },
        { status: 403 },
      );
    }

    const body = await req.json();

    const { data: event, error } = await (supabase as any)
      .from('club_events')
      .insert({
        club_id: id,
        title: body.title,
        description: body.description ?? null,
        event_type: body.event_type,
        sport: body.sport ?? null,
        level: body.level ?? 'all',
        location: body.location ?? null,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        starts_at: body.starts_at,
        ends_at: body.ends_at ?? null,
        max_participants: body.max_participants ?? null,
        is_members_only: body.is_members_only ?? false,
        recurrence_rule: body.recurrence_rule ?? null,
        created_by: user.id,
        status: 'upcoming',
      })
      .select()
      .single() as { data: any; error: any };

    if (error) throw error;

    // Generate future occurrences if recurrence_rule provided
    let occurrencesCreated = 0;
    if (body.recurrence_rule && event) {
      occurrencesCreated = await generateOccurrences(
        { ...event, recurrence_rule: body.recurrence_rule },
        8,
      );
    }

    return NextResponse.json(
      { ...event, occurrences_created: occurrencesCreated },
      { status: 201 },
    );
  } catch (err: any) {
    console.error('[POST /api/clubs/[id]/events]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; eid: string }> },
) {
  const { id, eid } = await params;

  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const supabase = getSupabaseAdminClient() as any;

  try {
    // Verify user is an active member of this club
    const { data: membership } = await supabase
      .from('club_members')
      .select('id')
      .eq('club_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle() as { data: { id: string } | null };

    if (!membership) {
      return NextResponse.json(
        { error: 'Vous devez être membre du club pour vous inscrire à cet événement' },
        { status: 403 },
      );
    }

    // Fetch event to check max_participants
    const { data: event, error: eventError } = await supabase
      .from('club_events')
      .select('id, max_participants, status')
      .eq('id', eid)
      .eq('club_id', id)
      .maybeSingle() as { data: { id: string; max_participants: number | null; status: string } | null; error: any };

    if (eventError) throw eventError;
    if (!event) return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 });
    if (event.status !== 'upcoming') {
      return NextResponse.json({ error: 'Cet événement n\'est plus disponible' }, { status: 409 });
    }

    // Check capacity if max_participants is set
    if (event.max_participants !== null) {
      const { count } = await supabase
        .from('club_event_participants')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eid)
        .eq('status', 'registered') as { count: number | null };

      if ((count ?? 0) >= event.max_participants) {
        return NextResponse.json(
          { error: 'Cet événement est complet' },
          { status: 409 },
        );
      }
    }

    // Check for existing registration
    const { data: existing } = await supabase
      .from('club_event_participants')
      .select('id, status')
      .eq('event_id', eid)
      .eq('user_id', user.id)
      .maybeSingle() as { data: { id: string; status: string } | null };

    if (existing && existing.status === 'registered') {
      return NextResponse.json({ error: 'Vous êtes déjà inscrit à cet événement' }, { status: 409 });
    }

    // Upsert registration
    const { data: registration, error: regError } = await supabase
      .from('club_event_participants')
      .upsert(
        { event_id: eid, user_id: user.id, status: 'registered' },
        { onConflict: 'event_id,user_id' },
      )
      .select()
      .single() as { data: any; error: any };

    if (regError) throw regError;

    return NextResponse.json(registration, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/clubs/[id]/events/[eid]/register]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; eid: string }> },
) {
  const { id, eid } = await params;
  void id; // scopes the route to the club but constraint is via event_id

  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const supabase = getSupabaseAdminClient() as any;

  try {
    const { data: existing } = await supabase
      .from('club_event_participants')
      .select('id')
      .eq('event_id', eid)
      .eq('user_id', user.id)
      .maybeSingle() as { data: { id: string } | null };

    if (!existing) {
      return NextResponse.json({ error: 'Inscription introuvable' }, { status: 404 });
    }

    const { error } = await supabase
      .from('club_event_participants')
      .update({ status: 'cancelled' })
      .eq('event_id', eid)
      .eq('user_id', user.id) as { error: any };

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/clubs/[id]/events/[eid]/register]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

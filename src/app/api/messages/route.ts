import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

// GET /api/messages — list conversations for current user
export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const admin = getSupabaseAdminClient();

  // Get user's coach_profile id (if any)
  const { data: coachProfile } = await admin
    .from('coach_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const coachId = coachProfile?.id;

  // Build OR filter: athlete_id = me OR coach_id = my_coach_profile
  let query = admin
    .from('conversations')
    .select(`
      id, coach_id, athlete_id, last_message_at, created_at
    `)
    .order('last_message_at', { ascending: false });

  if (coachId) {
    query = query.or(`athlete_id.eq.${user.id},coach_id.eq.${coachId}`);
  } else {
    query = query.eq('athlete_id', user.id);
  }

  const { data: conversations, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with participant info + last message + unread count
  const enriched = await Promise.all((conversations || []).map(async (conv) => {
    // Get the other participant's profile
    const isCoach = coachId && conv.coach_id === coachId;
    const otherId = isCoach ? conv.athlete_id : null;
    const otherCoachId = !isCoach ? conv.coach_id : null;

    let otherProfile = null;
    if (otherId) {
      const { data } = await admin.from('profiles').select('id, first_name, last_name, avatar_url').eq('id', otherId).single();
      otherProfile = data;
    } else if (otherCoachId) {
      const { data: cp } = await admin.from('coach_profiles').select('id, user_id').eq('id', otherCoachId).single();
      if (cp) {
        const { data } = await admin.from('profiles').select('id, first_name, last_name, avatar_url').eq('id', cp.user_id).single();
        otherProfile = data;
      }
    }

    // Last message
    const { data: lastMsg } = await admin
      .from('messages')
      .select('content, sender_id, created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Unread count (messages not sent by me, not read)
    const { count } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .neq('sender_id', user.id)
      .is('read_at', null);

    return {
      id: conv.id,
      other: otherProfile ? {
        name: [otherProfile.first_name, otherProfile.last_name].filter(Boolean).join(' ') || 'Utilisateur',
        avatar_url: otherProfile.avatar_url,
      } : { name: 'Utilisateur', avatar_url: null },
      lastMessage: lastMsg ? {
        content: lastMsg.content,
        isMe: lastMsg.sender_id === user.id,
        created_at: lastMsg.created_at,
      } : null,
      unreadCount: count || 0,
      last_message_at: conv.last_message_at,
    };
  }));

  return NextResponse.json(enriched);
}

// POST /api/messages — create or get a conversation
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { coach_id } = await request.json();
  if (!coach_id) return NextResponse.json({ error: 'coach_id requis' }, { status: 400 });

  const admin = getSupabaseAdminClient();

  // Check if conversation already exists
  const { data: existing } = await admin
    .from('conversations')
    .select('id')
    .eq('coach_id', coach_id)
    .eq('athlete_id', user.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ conversationId: existing.id });

  // Create new conversation
  const { data: conv, error } = await admin
    .from('conversations')
    .insert({ coach_id, athlete_id: user.id })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversationId: conv.id }, { status: 201 });
}

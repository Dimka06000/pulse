import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

// GET /api/messages/[conversationId] — get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const admin = getSupabaseAdminClient();

  // Verify user is participant
  const { data: conv } = await admin
    .from('conversations')
    .select('id, coach_id, athlete_id')
    .eq('id', conversationId)
    .single();

  if (!conv) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });

  // Check access
  const { data: coachProfile } = await admin
    .from('coach_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const isParticipant = conv.athlete_id === user.id || (coachProfile && conv.coach_id === coachProfile.id);
  if (!isParticipant) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  // Pagination
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const before = url.searchParams.get('before'); // cursor for older messages

  let query = admin
    .from('messages')
    .select('id, sender_id, content, read_at, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data: messages, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark unread messages as read
  await admin
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .is('read_at', null);

  // Get other participant info
  const otherId = conv.athlete_id === user.id ? conv.coach_id : conv.athlete_id;
  let otherProfile = null;

  if (conv.athlete_id === user.id) {
    // I'm the athlete, get coach profile
    const { data: cp } = await admin.from('coach_profiles').select('user_id').eq('id', conv.coach_id).single();
    if (cp) {
      const { data } = await admin.from('profiles').select('first_name, last_name, avatar_url').eq('id', cp.user_id).single();
      otherProfile = data;
    }
  } else {
    // I'm the coach, get athlete profile
    const { data } = await admin.from('profiles').select('first_name, last_name, avatar_url').eq('id', conv.athlete_id).single();
    otherProfile = data;
  }

  return NextResponse.json({
    conversationId,
    other: otherProfile ? {
      name: [otherProfile.first_name, otherProfile.last_name].filter(Boolean).join(' ') || 'Utilisateur',
      avatar_url: otherProfile.avatar_url,
    } : { name: 'Utilisateur', avatar_url: null },
    messages: (messages || []).reverse(), // chronological order
    hasMore: (messages || []).length === limit,
  });
}

// POST /api/messages/[conversationId] — send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { content } = await request.json();
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Message vide' }, { status: 400 });
  }
  if (content.length > 5000) {
    return NextResponse.json({ error: 'Message trop long (max 5000 caractères)' }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  // Verify participant
  const { data: conv } = await admin
    .from('conversations')
    .select('id, coach_id, athlete_id')
    .eq('id', conversationId)
    .single();

  if (!conv) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });

  const { data: coachProfile } = await admin
    .from('coach_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const isParticipant = conv.athlete_id === user.id || (coachProfile && conv.coach_id === coachProfile.id);
  if (!isParticipant) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  // Insert message
  const { data: message, error } = await admin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
    })
    .select('id, sender_id, content, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update conversation last_message_at
  await admin
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  // Send email notification to other participant (fire-and-forget)
  const recipientId = conv.athlete_id === user.id ? null : conv.athlete_id;
  const recipientCoachId = conv.athlete_id === user.id ? conv.coach_id : null;

  let recipientEmail: string | null = null;
  let recipientName = 'Utilisateur';

  if (recipientId) {
    const { data: p } = await admin.from('profiles').select('email, first_name').eq('id', recipientId).single();
    if (p) { recipientEmail = p.email; recipientName = p.first_name || 'Utilisateur'; }
  } else if (recipientCoachId) {
    const { data: cp } = await admin.from('coach_profiles').select('user_id').eq('id', recipientCoachId).single();
    if (cp) {
      const { data: p } = await admin.from('profiles').select('email, first_name').eq('id', cp.user_id).single();
      if (p) { recipientEmail = p.email; recipientName = p.first_name || 'Coach'; }
    }
  }

  // Resolve recipient user_id for push
  let recipientUserId: string | null = recipientId;
  if (!recipientUserId && recipientCoachId) {
    const { data: cp } = await admin.from('coach_profiles').select('user_id').eq('id', recipientCoachId).single();
    if (cp) recipientUserId = cp.user_id;
  }

  const { data: senderProfile } = await admin.from('profiles').select('first_name').eq('id', user.id).single();
  const senderName = senderProfile?.first_name || 'Quelqu\'un';

  // Email notification (fire-and-forget)
  if (recipientEmail) {
    import('@/lib/notifications/send').then(({ sendNewMessage }) => {
      sendNewMessage(recipientEmail!, {
        recipientName,
        senderName,
        messagePreview: content.trim().slice(0, 100),
      }).catch(console.error);
    });
  }

  // Push notification (fire-and-forget)
  if (recipientUserId) {
    import('@/lib/push/send').then(({ sendPushToUser }) => {
      sendPushToUser(recipientUserId!, {
        title: `Message de ${senderName}`,
        body: content.trim().slice(0, 100),
        url: `/messages/${conversationId}`,
        tag: `chat-${conversationId}`,
      }).catch(console.error);
    });
  }

  return NextResponse.json(message, { status: 201 });
}

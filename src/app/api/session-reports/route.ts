import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSessionReport } from '@oikos/coaching/tracking';

export async function POST(request: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  const body = await request.json();
  const { bookingId, coachNotes, athleteProgress, nextSessionFocus } = body;

  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId requis' }, { status: 400 });
  }

  const result = await createSessionReport(supabase, {
    bookingId,
    coachNotes: coachNotes || '',
    athleteProgress: athleteProgress || [],
    nextSessionFocus: nextSessionFocus || '',
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data, { status: 201 });
}

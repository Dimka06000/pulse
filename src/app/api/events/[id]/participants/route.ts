import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getEventParticipants } from '@oikos/coaching';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getSupabaseAdminClient();

  const role = req.nextUrl.searchParams.get('role') as 'coach' | 'athlete' | undefined;

  try {
    const participants = await getEventParticipants(supabase, id, role ?? undefined);
    return NextResponse.json(participants);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

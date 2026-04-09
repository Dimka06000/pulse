import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getCoachProfile } from '@oikos/coaching';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdminClient();

  try {
    const profile = await getCoachProfile(supabase, id);
    return NextResponse.json(profile);
  } catch (err: any) {
    if (err.code === 'PGRST116') {
      return NextResponse.json({ error: 'Coach introuvable' }, { status: 404 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

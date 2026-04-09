import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('ratings')
    .select(
      `id, score, comment, coach_reply, is_anonymous, created_at,
       booking:bookings(
         start_time,
         athlete:profiles!bookings_athlete_id_fkey(first_name, last_name),
         coach_profile:coach_profiles!bookings_coach_profile_id_fkey(
           profile:profiles!coach_profiles_user_id_fkey(first_name, last_name)
         )
       )`
    )
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ratings: data ?? [] });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'ID requis' }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { error } = await admin.from('ratings').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

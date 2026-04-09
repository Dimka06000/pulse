import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const sp = request.nextUrl.searchParams;
  const status = sp.get('status');
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '20', 10)));
  const offset = (page - 1) * limit;

  const admin = getSupabaseAdminClient();

  let query = admin
    .from('bookings')
    .select(
      `id, start_time, status, created_at,
       session_template:session_templates(title),
       athlete:profiles!bookings_athlete_id_fkey(first_name, last_name),
       coach_profile:coach_profiles!bookings_coach_profile_id_fkey(
         profile:profiles!coach_profiles_user_id_fkey(first_name, last_name)
       )`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    bookings: data ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}

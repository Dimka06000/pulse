import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const search = request.nextUrl.searchParams.get('search') ?? '';
  const admin = getSupabaseAdminClient();

  let query = admin
    .from('coach_profiles')
    .select(
      `id, specialties, hourly_rate, avg_rating, total_sessions, is_verified,
       profile:profiles!coach_profiles_user_id_fkey(first_name, last_name, email)`
    )
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(
      `profile.first_name.ilike.%${search}%,profile.last_name.ilike.%${search}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ coaches: data ?? [] });
}

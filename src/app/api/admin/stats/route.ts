import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = getSupabaseAdminClient();

  const [coaches, athletes, bookings, revenue, recent] = await Promise.all([
    admin
      .from('coach_profiles')
      .select('*', { count: 'exact', head: true }),
    admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'client'),
    admin
      .from('bookings')
      .select('*', { count: 'exact', head: true }),
    admin
      .from('payments')
      .select('amount_cents')
      .eq('status', 'succeeded'),
    admin
      .from('bookings')
      .select(
        `id, start_time, status,
         athlete:profiles!bookings_athlete_id_fkey(first_name, last_name),
         coach_profile:coach_profiles!bookings_coach_profile_id_fkey(
           profile:profiles!coach_profiles_user_id_fkey(first_name, last_name)
         )`
      )
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const totalRevenue = (revenue.data ?? []).reduce(
    (sum, p) => sum + (p.amount_cents ?? 0),
    0
  );

  return NextResponse.json({
    totalCoaches: coaches.count ?? 0,
    totalAthletes: athletes.count ?? 0,
    totalBookings: bookings.count ?? 0,
    totalRevenue,
    recentBookings: recent.data ?? [],
  });
}

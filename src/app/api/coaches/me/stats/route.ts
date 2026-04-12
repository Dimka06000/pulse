import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!coachProfile) {
    return NextResponse.json({ error: 'Profil coach requis' }, { status: 403 });
  }

  const coachId = coachProfile.id;

  const [clients, bookings, revenue, reviews] = await Promise.all([
    // Distinct clients count
    supabase
      .from('bookings')
      .select('athlete_id')
      .eq('coach_id', coachId),
    // Total bookings
    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', coachId),
    // Revenue
    supabase
      .from('payments')
      .select('amount_cents')
      .eq('coach_profile_id', coachId)
      .eq('status', 'succeeded'),
    // Average rating
    supabase
      .from('ratings')
      .select('score')
      .eq('coach_profile_id', coachId),
  ]);

  const uniqueClients = new Set((clients.data ?? []).map((b) => b.athlete_id)).size;
  const totalSessions = bookings.count ?? 0;
  const totalRevenue = (revenue.data ?? []).reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);
  const ratings = reviews.data ?? [];
  const avgRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1)
    : null;

  return NextResponse.json({
    clients: uniqueClients,
    sessions: totalSessions,
    revenue: totalRevenue,
    avgRating,
  });
}

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BookingList } from '@/components/booking/booking-list';

export const metadata = { title: 'Mes réservations' };

export default async function AthleteBookingsPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const now = new Date().toISOString();

  const { data: upcoming } = await supabase
    .from('bookings')
    .select('*, session_templates(title, sport), coach_profiles(profiles(name))')
    .eq('athlete_id', user.id)
    .gte('scheduled_at', now)
    .neq('status', 'cancelled')
    .order('scheduled_at', { ascending: true });

  const { data: past } = await supabase
    .from('bookings')
    .select('*, session_templates(title, sport), coach_profiles(profiles(name))')
    .eq('athlete_id', user.id)
    .lt('scheduled_at', now)
    .order('scheduled_at', { ascending: false })
    .limit(20);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-6">
        Mes réservations
      </h1>
      <BookingList upcoming={upcoming || []} past={past || []} />
    </div>
  );
}

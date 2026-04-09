import { getSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AvailabilityManager } from './availability-manager';

export const metadata = { title: 'Disponibilités — Coach' };

export default async function CoachAvailabilityPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!coachProfile) redirect('/profile');

  const { data: recurring } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('coach_id', coachProfile.id)
    .order('day_of_week')
    .order('start_time');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-6">
        Mes disponibilités
      </h1>
      <AvailabilityManager initialSlots={recurring || []} />
    </div>
  );
}

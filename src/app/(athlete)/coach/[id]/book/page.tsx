import { getSupabaseServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { BookingWizard } from '@/components/booking/booking-wizard';

export async function generateMetadata() {
  return { title: 'Réserver une séance' };
}

export default async function BookCoachPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: coachId } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch coach profile + name
  const { data: coach } = await supabase
    .from('coach_profiles')
    .select('id, user_id, profiles(name)')
    .eq('id', coachId)
    .single();

  if (!coach) notFound();

  // Fetch session templates
  const { data: sessions } = await supabase
    .from('session_templates')
    .select('*')
    .eq('coach_id', coachId)
    .order('title');

  // Fetch which days coach has recurring availability
  const { data: availSlots } = await supabase
    .from('availability_slots')
    .select('day_of_week')
    .eq('coach_id', coachId)
    .eq('is_active', true);

  const availableDays = [...new Set((availSlots || []).map((s: { day_of_week: number }) => s.day_of_week))];

  const coachName =
    (coach.profiles as { name: string } | null)?.name || 'Coach';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">
        Réserver avec {coachName}
      </h1>
      <p className="text-gray-500 mb-8">Choisissez votre séance et votre créneau</p>
      <BookingWizard
        coachId={coachId}
        coachName={coachName}
        sessions={(sessions || []) as any}
        availableDays={availableDays}
      />
    </div>
  );
}

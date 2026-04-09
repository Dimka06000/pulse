import { getSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SessionsManager } from './sessions-manager';

export const metadata = { title: 'Mes séances — Coach' };

export default async function CoachSessionsPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!coachProfile) redirect('/profile');

  const { data: sessions } = await supabase
    .from('session_templates')
    .select('*')
    .eq('coach_id', coachProfile.id)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-6">
        Mes séances
      </h1>
      <SessionsManager initialSessions={sessions || []} />
    </div>
  );
}

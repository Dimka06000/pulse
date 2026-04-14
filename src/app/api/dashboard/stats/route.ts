import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const db = getSupabaseAdminClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Get user profile for first name
  const { data: userProfile } = await db
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .single();

  // Sessions this week
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday
  weekStart.setHours(0, 0, 0, 0);

  const { count: weekBookingCount } = await db
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('athlete_id', user.id)
    .in('status', ['completed', 'confirmed'])
    .gte('scheduled_at', weekStart.toISOString());

  // Also count solo sessions this week
  let weekSoloCount = 0;
  try {
    const { count } = await db
      .from('solo_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('scheduled_at', weekStart.toISOString());
    weekSoloCount = count || 0;
  } catch { /* table may not exist */ }

  // Check Strava connection
  let stravaConnected = false;
  try {
    const { data: conn } = await db
      .from('user_connectors')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'strava')
      .maybeSingle();
    stravaConnected = !!conn;
  } catch { /* table may not exist */ }

  // Sessions this month (bookings completed/confirmed)
  const { count: bookingCount } = await db
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('athlete_id', user.id)
    .in('status', ['completed', 'confirmed'])
    .gte('scheduled_at', monthStart);

  // Total time (sum duration from session_templates via bookings)
  const { data: monthBookings } = await db
    .from('bookings')
    .select('session_templates(duration)')
    .eq('athlete_id', user.id)
    .in('status', ['completed', 'confirmed'])
    .gte('scheduled_at', monthStart);

  const totalTimeMinutes = (monthBookings || []).reduce((sum: number, b: any) =>
    sum + (b.session_templates?.duration || 60), 0
  );

  // Next session
  const { data: nextBooking } = await db
    .from('bookings')
    .select('scheduled_at, session_templates(title, sport, duration), coach_id')
    .eq('athlete_id', user.id)
    .eq('status', 'confirmed')
    .gt('scheduled_at', now.toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  let nextSession = null;
  if (nextBooking) {
    const tmpl = nextBooking.session_templates as any;
    // Get coach name
    let coachName: string | null = null;
    if (nextBooking.coach_id) {
      const { data: coachProfile } = await db
        .from('profiles')
        .select('first_name')
        .eq('id', nextBooking.coach_id)
        .single();
      coachName = coachProfile?.first_name || null;
    }
    nextSession = {
      title: tmpl?.title || 'Séance',
      sport: tmpl?.sport || '',
      duration: tmpl?.duration || 60,
      date: new Date(nextBooking.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      coachName,
    };
  }

  // Recent activity (last 5 completed)
  const { data: recent } = await db
    .from('bookings')
    .select('scheduled_at, session_templates(title, sport, duration)')
    .eq('athlete_id', user.id)
    .eq('status', 'completed')
    .order('scheduled_at', { ascending: false })
    .limit(5);

  const recentActivity = (recent || []).map((b: any) => ({
    title: b.session_templates?.title || 'Séance',
    sport: b.session_templates?.sport || '',
    emoji: '🏋️',
    duration: b.session_templates?.duration || 60,
    date: new Date(b.scheduled_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    source: 'pulse',
  }));

  // Also fetch synced activities from connected platforms
  let syncedRecent: any[] = [];
  try {
    const { data: synced } = await db
      .from('synced_activities')
      .select('sport, title, duration_seconds, start_time')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })
      .limit(5);
    syncedRecent = (synced || []).map((s: any) => ({
      title: s.title,
      sport: s.sport,
      emoji: '🔗',
      duration: Math.round(s.duration_seconds / 60),
      date: new Date(s.start_time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      source: 'synced',
    }));
  } catch {
    // synced_activities table may not exist yet
  }

  // Merge recent activities
  const allRecent = [...recentActivity, ...syncedRecent]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Today's program workout (for workout player)
  // Match by week_number + day_number relative to enrollment start date
  let todayWorkout: any = null;
  try {
    const { data: enrollments } = await db
      .from('program_enrollments')
      .select('program_id, started_at')
      .eq('athlete_id', user.id)
      .eq('status', 'active');

    if (enrollments && enrollments.length > 0) {
      const todayDayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 1=Mon...7=Sun

      for (const enroll of enrollments) {
        // Calculate current week based on enrollment start
        const started = enroll.started_at ? new Date(enroll.started_at) : now;
        const daysSinceStart = Math.floor((now.getTime() - started.getTime()) / 86400000);
        const currentWeek = Math.floor(daysSinceStart / 7) + 1;

        const { data: todayPW } = await db
          .from('program_workouts')
          .select('id, title, week_number, day_number, workout_data, duration_minutes, training_programs(title, sport)')
          .eq('program_id', enroll.program_id)
          .eq('week_number', currentWeek)
          .eq('day_number', todayDayOfWeek)
          .limit(1)
          .maybeSingle();

        if (todayPW) {
          const raw = todayPW.workout_data;
          const wd = typeof raw === 'string' ? JSON.parse(raw) : (raw || { exercises: [] });
          const exercises = wd.exercises || [];
          todayWorkout = {
            id: todayPW.id,
            title: todayPW.title || (todayPW.training_programs as any)?.title || 'Seance du jour',
            programTitle: (todayPW.training_programs as any)?.title || null,
            sport: (todayPW.training_programs as any)?.sport || null,
            hasExercises: exercises.length > 0,
            exerciseCount: exercises.length,
            duration: todayPW.duration_minutes || null,
          };
          break; // Found one, stop
        }
      }
    }
  } catch {
    // program tables may not exist
  }

  // Active goals count (handle table not existing)
  let activeGoals = 0;
  try {
    const { count } = await db
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active');
    activeGoals = count || 0;
  } catch {
    // goals table may not exist yet
  }

  return NextResponse.json({
    firstName: userProfile?.first_name || null,
    sessionsThisWeek: (weekBookingCount || 0) + weekSoloCount,
    sessionsThisMonth: bookingCount || 0,
    totalTimeMinutes,
    activeGoals,
    nextSession,
    todayWorkout,
    recentActivity: allRecent,
    stravaConnected,
  });
}

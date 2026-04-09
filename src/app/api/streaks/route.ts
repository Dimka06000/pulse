import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const db = getSupabaseAdminClient();

  const { data, error } = await db
    .from('user_streaks')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Erreur de chargement' }, { status: 500 });
  }

  return NextResponse.json(data || {
    current_streak: 0,
    longest_streak: 0,
    last_activity_date: null,
    total_activities: 0,
  });
}

export async function POST() {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const db = getSupabaseAdminClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Get existing streak
  const { data: existing } = await db
    .from('user_streaks')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing) {
    // Create new streak record
    const { data, error } = await db
      .from('user_streaks')
      .insert({
        user_id: user.id,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: today,
        total_activities: 1,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Erreur de création' }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  // Already logged today
  if (existing.last_activity_date === today) {
    const { data, error } = await db
      .from('user_streaks')
      .update({
        total_activities: existing.total_activities + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Erreur de mise à jour' }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  // Check if yesterday (continue streak) or gap (reset)
  const lastDate = new Date(existing.last_activity_date);
  const todayDate = new Date(today);
  const diffMs = todayDate.getTime() - lastDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const newStreak = diffDays === 1 ? existing.current_streak + 1 : 1;
  const newLongest = Math.max(newStreak, existing.longest_streak);

  const { data, error } = await db
    .from('user_streaks')
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_activity_date: today,
      total_activities: existing.total_activities + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erreur de mise à jour' }, { status: 500 });
  }

  return NextResponse.json(data);
}

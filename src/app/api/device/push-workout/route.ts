import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatWorkoutForGarmin } from '@/lib/connectors/garmin-push';

export async function POST(req: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  try {
    const body = await req.json();
    const { workout_data, title, sport } = body;

    if (!workout_data || !title) {
      return NextResponse.json({ error: 'workout_data et title requis' }, { status: 400 });
    }

    // Check active fitness connections
    const { data: connections } = await supabase
      .from('fitness_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (!connections || connections.length === 0) {
      return NextResponse.json(
        { error: 'Aucun appareil connecté. Connectez une montre dans vos paramètres.' },
        { status: 400 },
      );
    }

    // Pick the best connection for workout push
    const garmin = connections.find((c) => c.provider === 'garmin');
    const apple = connections.find((c) => c.provider === 'apple_health');
    const connection = garmin || apple || connections[0];
    const provider = connection.provider;

    // Format payload based on provider
    let payload: Record<string, unknown>;

    if (provider === 'garmin') {
      payload = formatWorkoutForGarmin(title, sport || 'fitness', workout_data) as unknown as Record<string, unknown>;
    } else if (provider === 'strava') {
      // Strava doesn't support pushing workouts — queue as notification only
      payload = { type: 'notification', message: `Nouvelle séance: ${title}`, workout_data };
    } else {
      // Generic: queue the raw data
      payload = { title, sport, workout_data };
    }

    // Create push queue entry
    const { data: queueEntry, error } = await supabase
      .from('device_push_queue')
      .insert({
        user_id: user.id,
        provider,
        action: provider === 'strava' ? 'notification' : 'push_workout',
        payload,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      provider,
      queue_id: queueEntry.id,
      status: 'queued',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

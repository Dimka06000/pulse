import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { scrapeEvent } from '@/lib/training/event-scraper';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  try {
    // Verify coach owns the program
    const { data: program } = await supabase
      .from('training_programs')
      .select('id, coach_profiles(user_id)')
      .eq('id', id)
      .single();

    if (!program) {
      return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 });
    }

    const coachProfile = program.coach_profiles as unknown as { user_id: string } | null;
    if (coachProfile?.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await req.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Champ requis: query' }, { status: 400 });
    }

    // Scrape the event
    const scrapedEvent = await scrapeEvent(query);

    // Delete existing target_events for this program
    await supabase
      .from('target_events')
      .delete()
      .eq('program_id', id);

    // Insert new target_event row
    const { data: targetEvent, error: insertError } = await supabase
      .from('target_events')
      .insert({
        program_id: id,
        name: scrapedEvent.name,
        event_date: scrapedEvent.event_date,
        sport: scrapedEvent.sport,
        location: scrapedEvent.location,
        distance_km: scrapedEvent.distance_km,
        elevation_m: scrapedEvent.elevation_m,
        terrain_type: scrapedEvent.terrain_type,
        scraped_data: {
          description: scrapedEvent.description,
          conditions: scrapedEvent.conditions,
          experienceReports: scrapedEvent.experienceReports,
        },
        source_urls: scrapedEvent.source_urls,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Update training_programs: set target_event_id
    const { error: updateError } = await supabase
      .from('training_programs')
      .update({ target_event_id: targetEvent.id })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({
      ...scrapedEvent,
      target_event_id: targetEvent.id,
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

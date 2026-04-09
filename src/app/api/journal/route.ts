import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 7);

  const fromDate = from || defaultFrom.toISOString().split('T')[0];
  const toDate = to || now.toISOString().split('T')[0];

  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from('journal_entries')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data || [] });
}

export async function POST(req: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const body = await req.json();
  const { date, sleep_hours, sleep_quality, energy_level, stress_level, mood, alcohol, caffeine_cups, supplements, notes } = body;

  if (!date) return NextResponse.json({ error: 'Date requise' }, { status: 400 });

  const db = getSupabaseAdminClient();
  const { data, error } = await db
    .from('journal_entries')
    .upsert({
      user_id: user.id,
      date,
      sleep_hours: sleep_hours ?? null,
      sleep_quality: sleep_quality ?? null,
      energy_level: energy_level ?? null,
      stress_level: stress_level ?? null,
      mood: mood ?? null,
      alcohol: alcohol ?? false,
      caffeine_cups: caffeine_cups ?? 0,
      supplements: supplements ?? [],
      notes: notes ?? '',
    }, { onConflict: 'user_id,date' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { listEvents, createEvent } from '@oikos/coaching';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdminClient();
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  const url = req.nextUrl;
  const filters = {
    sport: url.searchParams.get('sport') ?? undefined,
    level: url.searchParams.get('level') ?? undefined,
    dateFrom: url.searchParams.get('dateFrom') ?? undefined,
    dateTo: url.searchParams.get('dateTo') ?? undefined,
    city: url.searchParams.get('city') ?? undefined,
    type: url.searchParams.get('type') as any ?? undefined,
    status: url.searchParams.get('status') as any ?? undefined,
    page: url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1,
    limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 20,
  };

  try {
    const result = await listEvents(supabase, filters, user?.id);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Events API error:', err);
    return NextResponse.json({ data: [], count: 0 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  try {
    const body = await req.json();
    const result = await createEvent(supabase, body);
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

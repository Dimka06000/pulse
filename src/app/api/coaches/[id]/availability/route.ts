import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/coaches/[id]/availability — public, returns coach's weekly availability slots
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id: coachId } = await ctx.params;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('availability_slots')
    .select('id, day_of_week, start_time, end_time, is_active')
    .eq('coach_id', coachId)
    .eq('is_active', true)
    .order('day_of_week')
    .order('start_time');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

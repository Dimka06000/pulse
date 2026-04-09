import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAllSpecialties } from '@oikos/coaching';

export async function GET() {
  const supabase = getSupabaseAdminClient();

  try {
    const specialties = await getAllSpecialties(supabase);
    return NextResponse.json({ specialties });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

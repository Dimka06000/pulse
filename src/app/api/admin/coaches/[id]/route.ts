import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/guard';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const body = await request.json();
  const admin = getSupabaseAdminClient();

  const updates: Record<string, unknown> = {};
  if (typeof body.is_verified === 'boolean') {
    updates.is_verified = body.is_verified;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'Aucun champ à mettre à jour' },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from('coach_profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ coach: data });
}

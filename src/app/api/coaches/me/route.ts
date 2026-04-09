import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getMyCoachProfile, updateCoachProfile } from '@oikos/coaching';

export async function GET() {
  const authClient = await getSupabaseServerClient();

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  try {
    const profile = await getMyCoachProfile(supabase, user.id);
    if (!profile) {
      return NextResponse.json({ error: 'Profil coach introuvable' }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authClient = await getSupabaseServerClient();

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();

  try {
    const myProfile = await getMyCoachProfile(supabase, user.id);
    if (!myProfile) {
      return NextResponse.json({ error: 'Profil coach introuvable' }, { status: 404 });
    }

    const body = await req.json();
    const updated = await updateCoachProfile(supabase, myProfile.id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

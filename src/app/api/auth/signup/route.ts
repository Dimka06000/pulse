import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, name, role } = body;

  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  // Create user with admin client — auto-confirms email
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      role: role || 'client',
    },
  });

  if (error) {
    if (error.message.includes('already been registered') || error.message.includes('already exists')) {
      // User exists — just return success so frontend can auto-login
      return NextResponse.json({ success: true, existing: true });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Update profile row (trigger already created it with first_name from metadata)
  const user = data.user;
  await admin.from('profiles').update({
    first_name: name.split(' ')[0] || name,
    last_name: name.split(' ').slice(1).join(' ') || '',
    role: role === 'coach' ? 'coach' : 'athlete',
  }).eq('id', user.id);

  return NextResponse.json({ success: true, userId: user.id });
}

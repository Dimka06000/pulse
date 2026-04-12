import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function uniqueSlug(name: string): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const base = generateSlug(name);
  let slug = base;
  let suffix = 2;
  while (true) {
    const { data } = await supabase.from('clubs').select('id').eq('slug', slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${suffix}`;
    suffix++;
  }
}

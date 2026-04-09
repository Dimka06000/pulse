import { createClient } from '@supabase/supabase-js';

let adminInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdminClient() {
  if (!adminInstance) {
    adminInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return adminInstance;
}

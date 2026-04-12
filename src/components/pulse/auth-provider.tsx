'use client';

import { useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, clear } = useAuthStore();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Initial session check — always read role from profiles table
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        const role = profile?.role || (user.user_metadata?.role as string) || 'athlete';
        setUser(user.id, role as any);
      } else {
        clear();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Fetch role from profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          const role = profile?.role || session.user.user_metadata?.role || 'athlete';
          setUser(session.user.id, role as any);
        } else if (event === 'SIGNED_OUT') {
          clear();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser, clear]);

  return <>{children}</>;
}

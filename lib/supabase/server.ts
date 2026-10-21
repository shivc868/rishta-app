import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './env';

/**
 * Server-side Supabase client bound to the request's auth cookies. Use in
 * Server Components, Route Handlers and Server Actions. Every query runs as
 * the signed-in user, so Row Level Security — not this code — decides what an
 * admin may read or change.
 */
export async function supabaseServer(): Promise<SupabaseClient> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there. The
          // proxy refreshes the session on the next request, so this is safe.
        }
      },
    },
  });
}

/** The verified user for this request, or null. Uses getUser (server-verified), never getSession. */
export async function currentUser(): Promise<User | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

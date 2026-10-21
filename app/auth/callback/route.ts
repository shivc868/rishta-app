import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

/** Only same-origin paths may be used as a post-login destination. */
function safeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

/**
 * OAuth landing. Google sends the browser here with a one-time `code`; we swap
 * it for a Supabase session cookie, then hand off to /login, which mirrors the
 * user into the mock store and routes to /browse or /onboarding.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  const login = new URL('/login', origin);
  if (next) login.searchParams.set('next', next);

  if (!isSupabaseConfigured() || !code) {
    login.searchParams.set('error', 'oauth');
    return NextResponse.redirect(login);
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    login.searchParams.set('error', 'oauth');
    return NextResponse.redirect(login);
  }
  return NextResponse.redirect(login);
}

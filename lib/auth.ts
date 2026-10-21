'use client';

/**
 * Sign-in, mode-aware.
 *
 * In "supabase" mode the one-time code is a real Supabase phone OTP delivered
 * over WhatsApp (see lib/supabase/env.ts for the two delivery options), and
 * "Continue with Google" is Supabase's Google OAuth provider. In "demo" mode
 * both are the mock flows from lib/api.ts.
 *
 * After a real sign-in we also mirror the account into the mock store, because
 * the register screens still read mock data. That bridge disappears as each
 * screen moves to Supabase; nothing in the UI depends on it.
 */

import * as api from './api';
import { ApiError } from './api';
import { authMode, OTP_CHANNEL } from './supabase/env';
import { supabaseBrowser } from './supabase/client';

export { authMode };

/** Indian mobile number as E.164. Accepts 10 digits, or 91 + 10 digits. */
export function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const national = digits.length > 10 ? digits.slice(-10) : digits;
  return `+91${national}`;
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts. Wait a minute, then ask for a new code.';
  }
  if (m.includes('expired')) return 'That code has expired. Ask for a new one.';
  if (m.includes('invalid') || m.includes('token')) {
    return 'That code did not match. Check the WhatsApp message and try again.';
  }
  if (m.includes('unsupported phone provider') || m.includes('not enabled')) {
    return 'Phone sign-in is not enabled on the server yet. See supabase/README.md.';
  }
  return message;
}

export async function sendOtp(phone: string): Promise<{ hint: string }> {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) {
    throw new ApiError(
      'NOT_AUTHENTICATED',
      'Enter all 10 digits of your mobile number, without the country code.',
    );
  }
  if (authMode() === 'demo') return api.sendOtp(phone);

  const supabase = supabaseBrowser();
  const { error } = await supabase.auth.signInWithOtp({
    phone: toE164(phone),
    options: { channel: OTP_CHANNEL },
  });
  if (error) throw new ApiError('NOT_AUTHENTICATED', friendlyAuthError(error.message));
  return { hint: 'We sent a 6-digit code to your WhatsApp.' };
}

export async function verifyOtp(phone: string, code: string): Promise<void> {
  if (!/^\d{6}$/.test(code)) {
    throw new ApiError('NOT_AUTHENTICATED', 'The code is 6 digits. Enter all six and try again.');
  }
  if (authMode() === 'demo') {
    await api.verifyOtp(phone, code);
    return;
  }

  const supabase = supabaseBrowser();
  const { error } = await supabase.auth.verifyOtp({
    phone: toE164(phone),
    token: code,
    type: 'sms', // Supabase uses "sms" for every phone OTP, including WhatsApp.
  });
  if (error) throw new ApiError('NOT_AUTHENTICATED', friendlyAuthError(error.message));

  // Bridge: the register screens still run on the mock store.
  await api.verifyOtp(phone, code);
}

/** Where Google sends the browser back. The route handler there swaps the code for a session. */
function oauthRedirectUrl(next: string | null): string {
  const url = new URL('/auth/callback', window.location.origin);
  if (next) url.searchParams.set('next', next);
  return url.toString();
}

/**
 * Google sign-in. In supabase mode this navigates away to Google and resolves
 * with 'redirecting'; the login page finishes the job when the browser comes
 * back (see completeOAuthSignIn). In demo mode it signs a fixed demo Google
 * account into the mock store and resolves with 'done'.
 */
export async function signInWithGoogle(next: string | null): Promise<'done' | 'redirecting'> {
  if (authMode() === 'demo') {
    await api.signInWithGoogle(DEMO_GOOGLE_EMAIL);
    return 'done';
  }
  const supabase = supabaseBrowser();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: oauthRedirectUrl(next) },
  });
  if (error) throw new ApiError('NOT_AUTHENTICATED', friendlyAuthError(error.message));
  return 'redirecting';
}

export const DEMO_GOOGLE_EMAIL = 'demo.family@gmail.com';

/**
 * After the OAuth callback set the Supabase cookie, mirror that user into the
 * mock store (same bridge as verifyOtp). Returns true when a session now exists.
 */
export async function completeOAuthSignIn(): Promise<boolean> {
  if (authMode() !== 'supabase') return false;
  const { data } = await supabaseBrowser().auth.getUser();
  const user = data.user;
  if (!user) return false;
  if (user.phone) {
    await api.verifyOtp(user.phone, '000000');
  } else {
    await api.signInWithGoogle(user.email ?? user.id);
  }
  return true;
}

export async function signOut(): Promise<void> {
  if (authMode() === 'supabase') {
    await supabaseBrowser().auth.signOut();
  }
  await api.signOut();
}

/** True when a Supabase session exists (supabase mode) or the mock session is set (demo). */
export async function isSignedIn(): Promise<boolean> {
  if (authMode() === 'supabase') {
    const { data } = await supabaseBrowser().auth.getUser();
    return Boolean(data.user);
  }
  return Boolean((await api.getSession()).accountId);
}

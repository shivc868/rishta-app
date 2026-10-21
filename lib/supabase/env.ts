/**
 * Supabase configuration, read once.
 *
 * The app runs in two modes:
 *   - "demo": no Supabase env set. Login accepts any 6-digit code and every
 *     screen reads the mock store. This is what `git clone && npm run dev` gets.
 *   - "supabase": `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
 *     are set. Login sends a real one-time code over WhatsApp and the admin
 *     panel reads real tables.
 *
 * Components never branch on env vars directly — they ask `authMode()`.
 */

export type AuthMode = 'demo' | 'supabase';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Which channel Supabase should deliver the OTP on.
 *   - "whatsapp": Supabase's built-in WhatsApp delivery (Twilio / Twilio Verify).
 *   - "sms": the SMS channel. Pair this with the Send-SMS auth hook in
 *     app/api/auth/whatsapp-otp-hook to deliver over Meta's WhatsApp Cloud API
 *     instead of Twilio — the hook intercepts every "sms" and sends WhatsApp.
 */
export type OtpChannel = 'whatsapp' | 'sms';

export const OTP_CHANNEL: OtpChannel =
  process.env.NEXT_PUBLIC_OTP_CHANNEL === 'sms' ? 'sms' : 'whatsapp';

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function authMode(): AuthMode {
  return isSupabaseConfigured() ? 'supabase' : 'demo';
}

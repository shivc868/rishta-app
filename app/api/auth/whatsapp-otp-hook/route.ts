import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Supabase "Send SMS" auth hook -> WhatsApp Cloud API.
 *
 * Supabase generates and stores the OTP itself, then calls this endpoint
 * instead of an SMS provider. We deliver the code with a WhatsApp
 * *authentication* template (Meta requires that category for OTPs) and answer
 * 200. Verification stays entirely inside Supabase — this route never sees or
 * checks a user-entered code.
 *
 * Setup: Supabase dashboard -> Authentication -> Hooks -> Send SMS -> HTTPS,
 * URL https://<your-domain>/api/auth/whatsapp-otp-hook, copy the generated
 * secret into SUPABASE_SEND_SMS_HOOK_SECRET. Use NEXT_PUBLIC_OTP_CHANNEL=sms
 * on the client so Supabase routes the send through this hook.
 *
 * Env:
 *   SUPABASE_SEND_SMS_HOOK_SECRET   "v1,whsec_..." from the hook settings page
 *   WHATSAPP_ACCESS_TOKEN           permanent system-user token
 *   WHATSAPP_PHONE_NUMBER_ID        the sender's phone-number id
 *   WHATSAPP_OTP_TEMPLATE           template name (default "rishta_otp")
 *   WHATSAPP_TEMPLATE_LANG          template language (default "en_US")
 *   WHATSAPP_GRAPH_VERSION          default "v21.0"
 */

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION ?? 'v21.0';
const TEMPLATE = process.env.WHATSAPP_OTP_TEMPLATE ?? 'rishta_otp';
const TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG ?? 'en_US';
const MAX_SKEW_SECONDS = 5 * 60;

interface HookPayload {
  user?: { id?: string; phone?: string };
  sms?: { otp?: string };
}

function hookError(status: number, message: string) {
  // Shape Supabase expects so it can surface the failure to the client.
  return NextResponse.json({ error: { http_code: status, message } }, { status });
}

/**
 * Standard Webhooks signature check (what Supabase hooks use).
 * Signed content is `${id}.${timestamp}.${rawBody}`; the header may carry
 * several space-separated "v1,<base64>" signatures during secret rotation.
 */
function verifySignature(request: NextRequest, rawBody: string, secret: string): boolean {
  const id = request.headers.get('webhook-id');
  const timestamp = request.headers.get('webhook-timestamp');
  const signatureHeader = request.headers.get('webhook-signature');
  if (!id || !timestamp || !signatureHeader) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) return false;

  const keyPart = secret.split(',').find((p) => p.startsWith('whsec_')) ?? secret;
  const key = Buffer.from(keyPart.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest();

  return signatureHeader.split(' ').some((entry) => {
    const [version, sig] = entry.split(',');
    if (version !== 'v1' || !sig) return false;
    const given = Buffer.from(sig, 'base64');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

async function sendWhatsAppOtp(phoneE164: string, otp: string): Promise<void> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error('WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID are not set');
  }

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phoneE164.replace(/^\+/, ''),
      type: 'template',
      template: {
        name: TEMPLATE,
        language: { code: TEMPLATE_LANG },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: otp }] },
          // Authentication templates ship with a "copy code" button that
          // needs the same value as its URL parameter.
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: otp }] },
        ],
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WhatsApp API ${res.status}: ${body.slice(0, 400)}`);
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.SUPABASE_SEND_SMS_HOOK_SECRET;
  if (!secret) return hookError(500, 'SUPABASE_SEND_SMS_HOOK_SECRET is not set');

  const rawBody = await request.text();
  if (!verifySignature(request, rawBody, secret)) return hookError(401, 'Invalid hook signature');

  let payload: HookPayload;
  try {
    payload = JSON.parse(rawBody) as HookPayload;
  } catch {
    return hookError(400, 'Body is not JSON');
  }

  const phone = payload.user?.phone;
  const otp = payload.sms?.otp;
  if (!phone || !otp) return hookError(400, 'Payload is missing user.phone or sms.otp');

  try {
    await sendWhatsAppOtp(phone.startsWith('+') ? phone : `+${phone}`, otp);
  } catch (err) {
    console.error('[whatsapp-otp-hook]', err);
    return hookError(502, 'Could not deliver the WhatsApp message');
  }

  return NextResponse.json({});
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookHeart, Lock, ShieldCheck } from 'lucide-react';
import * as api from '@/lib/api';
import { ApiError } from '@/lib/api';
import { Button, Card, TextField } from '@/components/ui';
import { useSession, useToast } from '@/components/providers';

const DEMO_PHONE = '9876543210';

export default function LoginPage() {
  const router = useRouter();
  const { push } = useToast();
  const { ready, isSignedIn, activeProfile, refresh } = useSession();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  // Already signed in? Don't make them do it twice.
  useEffect(() => {
    if (ready && isSignedIn) router.replace(activeProfile ? '/browse' : '/onboarding');
  }, [ready, isSignedIn, activeProfile, router]);

  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus();
  }, [step]);

  async function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { hint } = await api.sendOtp(phone);
      push('info', hint);
      setStep('otp');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the code. Try once more.');
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.verifyOtp(phone, code);
      await refresh();
      const profiles = await api.getMyProfiles();
      router.replace(profiles.length ? '/browse' : '/onboarding');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'That code did not work. Ask for a new one.',
      );
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-linear-to-br from-stamp to-stamp-ink text-gold-soft shadow-card">
          <BookHeart size={26} aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Rishta Register</h1>
        <p className="hindi text-ink-3">रिश्ता रजिस्टर</p>
      </div>

      <Card className="p-5">
        {step === 'phone' ? (
          <form onSubmit={submitPhone} noValidate>
            <h2 className="text-lg font-bold leading-tight">
              Enter your mobile number
              <span className="hindi block font-normal text-ink-3">
                अपना मोबाइल नंबर डालें
              </span>
            </h2>
            <p className="mt-2 text-[15px] text-ink-2">
              We send a 6-digit code to this number. Only you see it.
            </p>

            <div className="mt-4 flex items-stretch gap-2">
              <span className="code grid shrink-0 place-items-center rounded-lg border-2 border-rule-strong bg-paper px-3 text-base font-semibold text-ink-2">
                +91
              </span>
              <TextField
                label="Mobile number"
                hindi="मोबाइल नंबर"
                className="flex-1"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="98765 43210"
                error={error}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={busy}
              className="mt-5"
              label={{ en: 'Send me the code', hi: 'कोड भेजें' }}
            />

            <button
              type="button"
              onClick={() => setPhone(DEMO_PHONE)}
              className="tap mt-3 w-full text-sm font-semibold text-stamp underline"
            >
              Use the demo family account ({DEMO_PHONE})
            </button>
          </form>
        ) : (
          <form onSubmit={submitOtp} noValidate>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setError(null);
                setCode('');
              }}
              className="tap -ml-2 mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-2"
            >
              <ArrowLeft size={18} aria-hidden />
              Change number
            </button>

            <h2 className="text-lg font-bold leading-tight">
              Enter the 6-digit code
              <span className="hindi block font-normal text-ink-3">6 अंकों का कोड डालें</span>
            </h2>
            <p className="mt-2 text-[15px] text-ink-2">
              Sent to <span className="code font-semibold">+91 {phone}</span>
            </p>

            <div className="mt-3 rounded-lg border-2 border-dashed border-stamp/40 bg-stamp-wash px-3 py-2 text-sm font-semibold text-stamp-ink">
              Demo: enter any 6 digits
              <span className="hindi block font-normal">डेमो: कोई भी 6 अंक डालें</span>
            </div>

            <TextField
              label="6-digit code"
              hindi="कोड"
              className="mt-4"
              ref={otpRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              error={error}
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={busy}
              className="mt-5"
              label={{ en: 'Open my register', hi: 'रजिस्टर खोलें' }}
            />
          </form>
        )}
      </Card>

      <div className="mt-6 space-y-3 text-[15px] text-ink-2">
        <p className="flex items-start gap-2.5">
          <Lock size={20} className="mt-0.5 shrink-0 text-seal" aria-hidden />
          <span>
            Your daughter&rsquo;s photo and phone number are never shown publicly.
            <span className="hindi block text-ink-3">
              आपकी बेटी की फ़ोटो और नंबर कभी सार्वजनिक नहीं होते।
            </span>
          </span>
        </p>
        <p className="flex items-start gap-2.5">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-seal" aria-hidden />
          <span>
            Photos and numbers open only when both families agree.
            <span className="hindi block text-ink-3">
              फ़ोटो और नंबर तभी खुलते हैं जब दोनों परिवार सहमत हों।
            </span>
          </span>
        </p>
      </div>
    </main>
  );
}

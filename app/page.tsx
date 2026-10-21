'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/nav';
import { useSession } from '@/components/providers';

/**
 * Entry point. The store lives in localStorage, so the decision can only be
 * made on the client — this renders the masthead while it waits, so the first
 * paint is the register, not a blank screen.
 */
export default function Home() {
  const router = useRouter();
  const { ready, isSignedIn, activeProfile } = useSession();

  useEffect(() => {
    if (!ready) return;
    if (!isSignedIn) router.replace('/login');
    else if (!activeProfile) router.replace('/onboarding');
    else router.replace('/browse');
  }, [ready, isSignedIn, activeProfile, router]);

  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div style={{ animation: 'rishta-pop-in 400ms var(--ease-out-soft)' }}>
        <div className="mx-auto mb-5 w-fit">
          <BrandMark size="lg" />
        </div>
        <h1 className="display text-3xl">Rishta</h1>
        <p className="hindi text-ink-3">रिश्ता रजिस्टर</p>
        <p className="mt-3 text-[15px] text-ink-2">Opening the register…</p>
      </div>
    </main>
  );
}

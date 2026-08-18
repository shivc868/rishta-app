'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookHeart } from 'lucide-react';
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
      <div>
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-linear-to-br from-stamp to-stamp-ink text-gold-soft shadow-card">
          <BookHeart size={30} aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Rishta Register</h1>
        <p className="hindi text-ink-3">रिश्ता रजिस्टर</p>
        <p className="mt-3 text-[15px] text-ink-2">Opening the register…</p>
      </div>
    </main>
  );
}

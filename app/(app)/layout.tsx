'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNav, Masthead } from '@/components/nav';
import { Skeleton } from '@/components/ui';
import { useSession } from '@/components/providers';

/**
 * Shell for every signed-in screen. The guard runs on the client because the
 * session lives in localStorage; until it resolves we render the masthead and a
 * skeleton so there is no flash of an empty page and no layout shift.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { ready, isSignedIn, activeProfile } = useSession();

  useEffect(() => {
    if (!ready) return;
    if (!isSignedIn) router.replace('/login');
    else if (!activeProfile) router.replace('/onboarding');
  }, [ready, isSignedIn, activeProfile, router]);

  return (
    <div
      className="min-h-dvh md:pb-0"
      style={{ paddingBottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}
    >
      <Masthead />
      <main
        className="mx-auto w-full max-w-5xl pb-6 pt-3 md:pt-5"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
        }}
      >
        {ready && isSignedIn && activeProfile ? (
          children
        ) : (
          <div className="space-y-3" aria-busy="true" aria-label="Loading">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminShell } from '@/components/admin/shell';
import { getAdminSession } from '@/lib/admin/session';
import { getStats } from '@/lib/admin/queries';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { currentUser } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Rishta Admin',
  robots: { index: false, follow: false },
};

// Every admin screen depends on the request's auth cookie; never prerender.
export const dynamic = 'force-dynamic';

/**
 * Server-rendered gate for every /admin screen. The proxy has already
 * redirected anonymous visitors to /login; here we check the role against
 * the database on every request and only then render the shell.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const session = await getAdminSession();
  if (!session) {
    const user = await currentUser();
    const who = user?.phone ? `+${user.phone.replace(/^\+/, '')}` : (user?.email ?? null);
    return <NotAnAdmin who={who} />;
  }

  const stats = await getStats().catch(() => null);

  return (
    <AdminShell
      session={session}
      pendingCount={stats?.pending_review ?? 0}
      openReports={stats?.open_reports ?? 0}
    >
      {children}
    </AdminShell>
  );
}

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
      <div className="rounded-2xl bg-card p-6 ring-1 ring-rule shadow-[var(--shadow-e2)]">
        <h1 className="text-xl font-bold">{title}</h1>
        <div className="mt-3 space-y-3 text-[15px] text-ink-2">{children}</div>
      </div>
    </main>
  );
}

function SetupNotice() {
  return (
    <Frame title="Admin panel needs Supabase">
      <p>
        The register runs in demo mode until Supabase is connected. Add these to{' '}
        <code className="code">.env.local</code> and restart:
      </p>
      <pre className="overflow-x-auto rounded-xl bg-paper p-3 text-[13px] text-ink">
        {`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...`}
      </pre>
      <p>
        Then run <code className="code">supabase/migrations/0001_schema.sql</code> and add your number
        as the first superadmin. The full walkthrough is in{' '}
        <code className="code">supabase/README.md</code>.
      </p>
      <Link href="/" className="inline-block font-semibold text-stamp underline">
        Back to the register
      </Link>
    </Frame>
  );
}

function NotAnAdmin({ who }: { who: string | null }) {
  return (
    <Frame title="This area is for admins">
      <p>
        {who ? (
          <>
            You are signed in as <span className="code font-semibold">{who}</span>, but that account is
            not on the admin list.
          </>
        ) : (
          'You are not signed in.'
        )}
      </p>
      <p>Ask a super admin to add your number or email, then sign in again.</p>
      <div className="flex gap-4">
        <Link href="/login?next=/admin" className="font-semibold text-stamp underline">
          Sign in with another account
        </Link>
        <Link href="/" className="font-semibold text-ink-2 underline">
          Back to the register
        </Link>
      </div>
    </Frame>
  );
}

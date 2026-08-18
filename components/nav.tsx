'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookHeart, Bookmark, Inbox, Search, Settings, Users } from 'lucide-react';
import { useSession } from './providers';
import { cx } from './ui';
import { GENDER_LABELS } from '@/lib/labels';

const TABS = [
  { href: '/browse', en: 'Search', hi: 'खोजें', icon: Search },
  { href: '/requests', en: 'Requests', hi: 'निवेदन', icon: Inbox, badge: true },
  { href: '/connections', en: 'Connected', hi: 'जुड़े', icon: Users },
  { href: '/shortlist', en: 'Saved', hi: 'सहेजे', icon: Bookmark },
  { href: '/settings', en: 'Settings', hi: 'सेटिंग', icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { pending } = useSession();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-card shadow-[0_-2px_10px_rgb(59_36_48/0.07)] md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          const badge = 'badge' in tab && tab.badge ? pending.received : 0;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 px-1 py-1.5',
                  active ? 'text-stamp' : 'text-ink-2',
                )}
              >
                {/* Active pill behind the icon — softer than an edge bar */}
                <span
                  className={cx(
                    'relative grid h-7 w-12 place-items-center rounded-full transition-colors',
                    active && 'bg-stamp-wash',
                  )}
                >
                  <Icon size={22} aria-hidden strokeWidth={active ? 2.4 : 2} />
                  {badge > 0 ? (
                    <span className="code absolute -right-1 -top-1.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-oxide px-1 text-[11px] font-bold text-white">
                      {badge}
                    </span>
                  ) : null}
                </span>
                <span className="text-[11px] font-semibold leading-none">{tab.en}</span>
                <span className="hindi text-[11px] leading-none">{tab.hi}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Desktop equivalent — a light tab row under the maroon masthead. */
export function TopNav() {
  const pathname = usePathname();
  const { pending } = useSession();
  return (
    <nav aria-label="Main" className="hidden bg-card md:block">
      <ul className="mx-auto flex max-w-5xl gap-1 px-4">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const badge = 'badge' in tab && tab.badge ? pending.received : 0;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'relative flex min-h-12 items-center gap-2 px-4 py-2.5 text-[15px] font-semibold',
                  active ? 'text-stamp' : 'text-ink-2 hover:text-ink',
                )}
              >
                {tab.en}
                {badge > 0 ? (
                  <span className="code grid h-5 min-w-5 place-items-center rounded-full bg-oxide px-1 text-[11px] font-bold text-white">
                    {badge}
                  </span>
                ) : null}
                {active ? (
                  <span aria-hidden className="absolute inset-x-3 bottom-0 h-0.75 rounded-t-full bg-stamp" />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * The masthead is the one place the app is allowed to be openly celebratory:
 * a deep maroon band, gold zari hairline beneath it — a wedding-card cover.
 * Everything below it goes back to calm ivory.
 */
export function Masthead() {
  const { activeProfile } = useSession();
  return (
    <header className="sticky top-0 z-40 shadow-[0_2px_10px_rgb(59_36_48/0.12)]">
      <div className="bg-linear-to-r from-stamp-ink via-stamp to-stamp-ink text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <Link href="/browse" className="flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 place-items-center rounded-full border border-gold-soft/70 bg-white/10 text-gold-soft"
              aria-hidden
            >
              <BookHeart size={18} />
            </span>
            <span className="leading-none">
              <span className="block text-[17px] font-bold tracking-tight">Rishta Register</span>
              <span className="hindi block text-gold-soft">रिश्ता रजिस्टर</span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            {activeProfile ? (
              <Link
                href="/settings"
                className="tap flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-2.5 py-1.5 text-left hover:bg-white/15"
              >
                <span className="leading-tight">
                  <span className="block text-[11px] uppercase tracking-wide text-white/70">
                    Searching for
                  </span>
                  <span className="code block text-sm font-bold">
                    {activeProfile.publicCode}
                  </span>
                </span>
                <span className="hindi border-l border-white/25 pl-2 text-gold-soft">
                  {GENDER_LABELS[activeProfile.gender].hi}
                </span>
              </Link>
            ) : null}
          </div>
        </div>
        {/* The zari rule — gold foil hairline off the invitation card */}
        <div aria-hidden className="zari h-0.75 w-full" />
      </div>
      <TopNav />
    </header>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookHeart, Inbox, Search, Settings, Sparkles, UserRound, Users } from 'lucide-react';
import { useSession } from './providers';
import { cx } from './ui';

const TABS = [
  { href: '/browse', en: 'Search', hi: 'खोजें', icon: Search },
  { href: '/requests', en: 'Requests', hi: 'निवेदन', icon: Inbox, badge: true },
  { href: '/connections', en: 'Connected', hi: 'जुड़े', icon: Users },
  { href: '/matched', en: 'Matched', hi: 'मिलते-जुलते', icon: Sparkles },
  { href: '/settings', en: 'Settings', hi: 'सेटिंग', icon: Settings },
] as const;

/** The brand mark: rounded gradient tile. One asset, used at every size. */
export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const box = { sm: 'h-9 w-9 rounded-xl', md: 'h-11 w-11 rounded-2xl', lg: 'h-16 w-16 rounded-2xl' }[size];
  const icon = { sm: 18, md: 22, lg: 30 }[size];
  return (
    <span
      aria-hidden
      className={cx(
        'brand-gradient grid shrink-0 place-items-center text-white shadow-[var(--shadow-brand)]',
        box,
      )}
    >
      <BookHeart size={icon} strokeWidth={2.2} />
    </span>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { pending } = useSession();

  return (
    <nav
      aria-label="Main"
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-rule md:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
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
                  'relative flex min-h-[62px] flex-col items-center justify-center gap-1 px-1 py-2',
                  'transition-colors duration-150',
                  active ? 'text-stamp' : 'text-ink-3 hover:text-ink-2',
                )}
              >
                {/* Active pill behind the icon — softer than an edge bar */}
                <span
                  className={cx(
                    'relative grid h-8 w-14 place-items-center rounded-full transition-all duration-200',
                    active && 'bg-stamp-wash ring-1 ring-stamp-ring',
                  )}
                >
                  <Icon size={21} aria-hidden strokeWidth={active ? 2.4 : 2} />
                  {badge > 0 ? (
                    <span className="code absolute -right-0.5 -top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-stamp px-1 text-[11px] font-bold text-white ring-2 ring-card">
                      {badge}
                    </span>
                  ) : null}
                </span>
                <span className="text-[11px] font-semibold leading-none">{tab.en}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Desktop nav — pill tabs inside the glass header. */
export function TopNav() {
  const pathname = usePathname();
  const { pending } = useSession();
  return (
    <nav aria-label="Main" className="hidden md:block">
      <ul className="flex items-center gap-1">
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
                  'relative flex min-h-10 items-center gap-2 rounded-full px-3.5 py-2 text-[14.5px] font-semibold',
                  'transition-colors duration-150',
                  active
                    ? 'bg-stamp-wash text-stamp ring-1 ring-stamp-ring'
                    : 'text-ink-2 hover:bg-paper-deep hover:text-ink',
                )}
              >
                <Icon size={17} aria-hidden strokeWidth={active ? 2.4 : 2} />
                {tab.en}
                {badge > 0 ? (
                  <span className="code grid h-5 min-w-5 place-items-center rounded-full bg-stamp px-1 text-[11px] font-bold text-white">
                    {badge}
                  </span>
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
 * The header: a frosted white bar with the gradient brand mark, pill tabs on
 * desktop and the active-profile chip on the right. The brand hairline under
 * it is the one decorative flourish that survived the redesign.
 */
export function Masthead() {
  const { activeProfile } = useSession();
  const pathname = usePathname();
  const onMe = pathname.startsWith('/me');
  return (
    <header
      className="glass sticky top-0 z-40 border-b border-rule"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-2.5">
        <Link href="/browse" className="flex shrink-0 items-center gap-2.5">
          <BrandMark size="sm" />
          <span className="leading-none">
            <span className="display block text-[17px] text-ink">Rishta</span>
            <span className="hindi block text-ink-3">रिश्ता रजिस्टर</span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-4">
          <TopNav />
          {activeProfile ? (
            /* Same size as the brand mark; when /me is open it takes the
               active-tab treatment: pale pink pill, pink glyph. */
            <Link
              href="/me"
              aria-label="My profile"
              aria-current={onMe ? 'page' : undefined}
              className={cx(
                'tap grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors',
                onMe
                  ? 'bg-stamp-wash text-stamp ring-1 ring-stamp-ring'
                  : 'brand-gradient text-white shadow-[var(--shadow-e1)]',
              )}
            >
              <UserRound size={19} strokeWidth={onMe ? 2.4 : 2.2} aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
      {/* The zari rule — 1px brand fade, the invitation card's last trace */}
      <div aria-hidden className="zari h-[2px] w-full" />
    </header>
  );
}

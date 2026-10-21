'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Flag,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Search,
  Users,
} from 'lucide-react';
import { BrandMark } from '@/components/nav';
import { cx } from '@/lib/cx';
import { signOut } from '@/lib/auth';
import { ROLE_LABELS, type AdminSession } from '@/lib/admin/types';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  superadmin?: boolean;
  badge?: 'pending' | 'reports';
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true }],
  },
  {
    title: 'Moderation',
    items: [
      { href: '/admin/profiles', label: 'Profiles', icon: ClipboardList, badge: 'pending' },
      { href: '/admin/reports', label: 'Reports', icon: Flag, badge: 'reports' },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
      { href: '/admin/admins', label: 'Admins', icon: Users, superadmin: true },
    ],
  },
];

const CRUMBS: Record<string, string> = {
  profiles: 'Profiles',
  reports: 'Reports',
  audit: 'Audit log',
  admins: 'Admins',
  denied: 'Access',
};

export function AdminShell({
  session,
  pendingCount,
  openReports = 0,
  children,
}: {
  session: AdminSession;
  pendingCount: number;
  openReports?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const badges = { pending: pendingCount, reports: openReports };
  const segments = pathname.split('/').filter(Boolean).slice(1); // drop "admin"
  const crumbs = segments.map((s, i) => ({
    label: CRUMBS[s] ?? (i > 0 ? 'Review' : s),
    href: `/admin/${segments.slice(0, i + 1).join('/')}`,
  }));

  const onSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <div className="flex min-h-dvh bg-paper">
      {/* --- Sidebar (desktop) ------------------------------------------------- */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-inverse text-white md:flex">
        <div className="flex items-center gap-3 px-4 pb-4 pt-5">
          <BrandMark size="sm" />
          <span className="leading-none">
            <span className="display block text-[16px]">Rishta</span>
            <span className="mt-0.5 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/55">
              Admin console
            </span>
          </span>
        </div>

        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 pb-3">
          {GROUPS.map((group) => {
            const items = group.items.filter((n) => !n.superadmin || session.role === 'superadmin');
            if (!items.length) return null;
            return (
              <div key={group.title} className="mt-4 first:mt-1">
                <div className="px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  {group.title}
                </div>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    const count = item.badge ? badges[item.badge] : 0;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={cx(
                            'relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors',
                            active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/6 hover:text-white',
                          )}
                        >
                          {active && (
                            <span
                              aria-hidden
                              className="absolute -left-3 top-1.5 h-6 w-[3px] rounded-r-full bg-stamp-soft"
                            />
                          )}
                          <Icon size={16} strokeWidth={2} aria-hidden className={active ? 'text-white' : 'text-white/60'} />
                          {item.label}
                          {count > 0 && (
                            <span
                              className={cx(
                                'ml-auto rounded-full px-1.5 py-px text-[11px] font-bold tabular-nums',
                                item.badge === 'pending' ? 'bg-stamp text-white' : 'bg-gold text-white',
                              )}
                            >
                              {count}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Identity session={session} onSignOut={onSignOut} dark />
        </div>
      </aside>

      {/* --- Main column ------------------------------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 border-b border-rule">
          <div className="flex h-14 items-center gap-3 px-4 md:px-6">
            <div className="flex items-center gap-2 md:hidden">
              <BrandMark size="sm" />
            </div>

            <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-[13px] md:flex">
              <Link href="/admin" className="font-medium text-ink-2 hover:text-ink">
                Admin
              </Link>
              {crumbs.map((c, i) => (
                <span key={c.href} className="flex items-center gap-1">
                  <ChevronRight size={14} className="text-ink-3" aria-hidden />
                  {i === crumbs.length - 1 ? (
                    <span className="font-semibold text-ink">{c.label}</span>
                  ) : (
                    <Link href={c.href} className="font-medium text-ink-2 hover:text-ink">
                      {c.label}
                    </Link>
                  )}
                </span>
              ))}
              {crumbs.length === 0 && (
                <span className="flex items-center gap-1">
                  <ChevronRight size={14} className="text-ink-3" aria-hidden />
                  <span className="font-semibold text-ink">Dashboard</span>
                </span>
              )}
            </nav>

            <form action="/admin/profiles" method="get" className="ml-auto flex min-w-0 max-w-md flex-1 md:flex-none">
              <input type="hidden" name="status" value="all" />
              <label className="relative block w-full md:w-72">
                <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
                <input
                  name="q"
                  type="search"
                  placeholder="Search code, town, jati…"
                  autoComplete="off"
                  className="h-9 w-full rounded-lg bg-paper-deep/70 pl-8 pr-3 text-[13px] text-ink placeholder:text-ink-3 focus:bg-card focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                />
              </label>
            </form>

            <Link
              href="/"
              className="hidden h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:bg-paper-deep hover:text-ink lg:inline-flex"
            >
              View register <ExternalLink size={14} aria-hidden />
            </Link>

            <div className="md:hidden">
              <Identity session={session} onSignOut={onSignOut} compact />
            </div>
          </div>

          {/* Mobile nav strip */}
          <nav aria-label="Admin" className="flex gap-1 overflow-x-auto border-t border-rule px-3 py-1.5 md:hidden">
            {GROUPS.flatMap((g) => g.items)
              .filter((n) => !n.superadmin || session.role === 'superadmin')
              .map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                const count = item.badge ? badges[item.badge] : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold',
                      active ? 'bg-inverse text-white' : 'text-ink-2 hover:bg-paper-deep',
                    )}
                  >
                    {item.label}
                    {count > 0 && (
                      <span className="rounded-full bg-stamp px-1.5 text-[10.5px] font-bold text-white">{count}</span>
                    )}
                  </Link>
                );
              })}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function Identity({
  session,
  onSignOut,
  dark = false,
  compact = false,
}: {
  session: AdminSession;
  onSignOut: () => void;
  dark?: boolean;
  compact?: boolean;
}) {
  const name = session.displayName || session.phone || session.email || 'Admin';
  const initials = name
    .replace(/^\+?\d+$/, 'A')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="flex w-full items-center gap-2.5">
      <span
        aria-hidden
        className={cx(
          'grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-bold',
          dark ? 'bg-white/12 text-white' : 'bg-stamp-wash text-stamp',
        )}
      >
        {initials}
      </span>
      {!compact && (
        <span className="min-w-0 flex-1 leading-tight">
          <span className={cx('block truncate text-[13px] font-semibold', dark ? 'text-white' : 'text-ink')}>{name}</span>
          <span className={cx('block truncate text-[11.5px]', dark ? 'text-white/50' : 'text-ink-3')}>
            {ROLE_LABELS[session.role]}
            {session.email && session.displayName ? ` · ${session.email}` : ''}
          </span>
        </span>
      )}
      <button
        type="button"
        onClick={onSignOut}
        aria-label="Sign out"
        title="Sign out"
        className={cx(
          'grid h-8 w-8 place-items-center rounded-lg transition-colors',
          dark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-ink-3 hover:bg-paper-deep hover:text-ink',
        )}
      >
        <LogOut size={16} aria-hidden />
      </button>
    </div>
  );
}

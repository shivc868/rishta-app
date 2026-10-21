/**
 * Presentational admin primitives — no client hooks, so Server Components
 * compose them directly. Interactive pieces (ActionForm) live in bits.tsx.
 *
 * The admin panel is a desktop tool for a handful of trained people, so the
 * type floor drops to 13px and rows pack tighter than the family-facing app.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Inbox, type LucideIcon } from 'lucide-react';
import { cx } from '@/lib/cx';
import type { ProfileStatus } from '@/types';
import type { ReportStatus } from '@/lib/admin/types';

// --- Page scaffolding ---------------------------------------------------------

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-ink-3">{eyebrow}</div>
        )}
        <h1 className="text-[22px] font-bold leading-tight tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-[13.5px] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** A bordered surface with an optional titled header row. */
export function Panel({
  title,
  description,
  icon: Icon,
  actions,
  tone = 'card',
  padded = true,
  className,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  tone?: 'card' | 'manila' | 'danger';
  padded?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    card: 'bg-card ring-rule',
    manila: 'bg-manila ring-manila-deep',
    danger: 'bg-oxide-wash ring-oxide/25',
  };
  const rule = {
    card: 'border-rule',
    manila: 'border-manila-deep',
    danger: 'border-oxide/20',
  };
  return (
    <section
      className={cx('overflow-hidden rounded-xl ring-1 shadow-[var(--shadow-e1)]', tones[tone], className)}
    >
      {(title || actions) && (
        <div className={cx('flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3', rule[tone])}>
          <div className="flex min-w-0 items-center gap-2">
            {Icon && <Icon size={15} className={tone === 'danger' ? 'text-oxide' : 'text-ink-3'} aria-hidden />}
            <div className="min-w-0">
              <h2 className={cx('text-[13px] font-semibold', tone === 'danger' ? 'text-oxide' : 'text-ink')}>
                {title}
              </h2>
              {description && <p className="text-[12.5px] text-ink-2">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padded ? 'p-4' : undefined}>{children}</div>
    </section>
  );
}

// --- Stats ------------------------------------------------------------------

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'ink',
  href,
}: {
  label: string;
  value: number | string;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: 'ink' | 'stamp' | 'seal' | 'oxide' | 'gold';
  href?: string;
}) {
  const iconTone = {
    ink: 'bg-paper-deep text-ink-2',
    stamp: 'bg-stamp-wash text-stamp',
    seal: 'bg-seal-wash text-seal',
    oxide: 'bg-oxide-wash text-oxide',
    gold: 'bg-[#fdf3e2] text-gold',
  }[tone];
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
        {Icon && (
          <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-lg', iconTone)}>
            <Icon size={16} aria-hidden />
          </span>
        )}
      </div>
      <div className="mt-2 text-[28px] font-bold leading-none tabular-nums tracking-tight text-ink">
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </div>
      {hint && <div className="mt-2 text-[12.5px] text-ink-2">{hint}</div>}
    </>
  );
  const base = 'block rounded-xl bg-card p-4 ring-1 ring-rule shadow-[var(--shadow-e1)]';
  return href ? (
    <Link href={href} className={cx(base, 'transition-shadow hover:shadow-[var(--shadow-e2)]')}>
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}

/** Stacked proportion bar with a legend — the whole register at a glance. */
export function BreakdownBar({ parts }: { parts: Array<{ label: string; value: number; className: string }> }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-paper-deep">
        {parts.map((p) => (
          <span
            key={p.label}
            className={p.className}
            style={{ width: `${(p.value / total) * 100}%` }}
            title={`${p.label}: ${p.value}`}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px]">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span className={cx('h-2 w-2 rounded-full', p.className)} aria-hidden />
            <span className="text-ink-2">{p.label}</span>
            <span className="font-semibold tabular-nums text-ink">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Badges -----------------------------------------------------------------

export type PillTone = 'seal' | 'oxide' | 'stamp' | 'ink' | 'gold';

export function Pill({
  tone = 'ink',
  dot = true,
  children,
}: {
  tone?: PillTone;
  dot?: boolean;
  children: ReactNode;
}) {
  const tones: Record<PillTone, string> = {
    seal: 'bg-seal-wash text-seal ring-seal/20',
    oxide: 'bg-oxide-wash text-oxide ring-oxide/25',
    stamp: 'bg-stamp-wash text-stamp ring-stamp/20',
    ink: 'bg-paper-deep text-ink-2 ring-rule-strong',
    gold: 'bg-[#fdf3e2] text-gold ring-gold/25',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold ring-1 ring-inset',
        tones[tone],
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export const PROFILE_STATUS_META: Record<ProfileStatus, { label: string; tone: PillTone; bar: string }> = {
  pending_review: { label: 'Hidden for review', tone: 'gold', bar: 'bg-gold' },
  active: { label: 'Active', tone: 'seal', bar: 'bg-seal' },
  paused: { label: 'Paused', tone: 'ink', bar: 'bg-ink-3' },
  matched: { label: 'Matched', tone: 'stamp', bar: 'bg-stamp' },
};

export function StatusBadge({ status }: { status: ProfileStatus }) {
  const m = PROFILE_STATUS_META[status];
  return <Pill tone={m.tone}>{m.label}</Pill>;
}

const REPORT_META: Record<ReportStatus, { label: string; tone: PillTone }> = {
  open: { label: 'Open', tone: 'oxide' },
  resolved: { label: 'Resolved', tone: 'seal' },
  dismissed: { label: 'Dismissed', tone: 'ink' },
};

export function ReportBadge({ status }: { status: ReportStatus }) {
  const m = REPORT_META[status];
  return <Pill tone={m.tone}>{m.label}</Pill>;
}

// --- Identity ---------------------------------------------------------------

function hueOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

/** Initials disc, tinted per seed so a list of rows reads as distinct people. */
export function Avatar({
  seed,
  label,
  size = 'md',
}: {
  seed: string;
  /** Text to derive initials from; falls back to the seed. */
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const h = hueOf(seed);
  const src = (label || seed).trim();
  const initials = src
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
  const dims = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-[12.5px]', lg: 'h-14 w-14 text-[18px]' }[size];
  return (
    <span
      aria-hidden
      className={cx('grid shrink-0 place-items-center rounded-full font-bold', dims)}
      style={{ backgroundColor: `hsl(${h} 45% 92%)`, color: `hsl(${h} 40% 32%)` }}
    >
      {initials}
    </span>
  );
}

// --- Tables -----------------------------------------------------------------

type Col = string | { label: string; align?: 'left' | 'right'; className?: string };

export function Table({
  head,
  children,
  footer,
  minWidth = 720,
}: {
  head: Col[];
  children: ReactNode;
  footer?: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-rule shadow-[var(--shadow-e1)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13.5px]" style={{ minWidth }}>
          <thead className="border-b border-rule bg-paper/70 text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
            <tr>
              {head.map((h) => {
                const col = typeof h === 'string' ? { label: h } : h;
                return (
                  <th
                    key={col.label}
                    scope="col"
                    className={cx('px-4 py-2.5 font-semibold', col.align === 'right' && 'text-right', col.className)}
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">{children}</tbody>
        </table>
      </div>
      {footer && (
        <div className="border-t border-rule bg-paper/50 px-4 py-2.5 text-[12.5px] text-ink-2">{footer}</div>
      )}
    </div>
  );
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cx('transition-colors hover:bg-paper/80', className)}>{children}</tr>;
}

export function Td({
  children,
  className,
  muted = false,
  align,
}: {
  children?: ReactNode;
  className?: string;
  muted?: boolean;
  align?: 'left' | 'right';
}) {
  return (
    <td
      className={cx(
        'px-4 py-2.5 align-middle',
        muted && 'text-ink-2',
        align === 'right' && 'text-right tabular-nums',
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Pagination({
  page,
  pages,
  total,
  pageSize,
  href,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  href: (page: number) => string;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn =
    'inline-flex h-8 items-center gap-1 rounded-lg bg-card px-2.5 text-[12.5px] font-semibold text-ink ring-1 ring-inset ring-rule-strong hover:bg-paper';
  const off = 'pointer-events-none opacity-40';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span>
        Showing{' '}
        <span className="font-semibold text-ink">
          {from}–{to}
        </span>{' '}
        of <span className="font-semibold text-ink">{total.toLocaleString('en-IN')}</span>
      </span>
      <div className="flex items-center gap-1.5">
        <Link href={href(Math.max(1, page - 1))} aria-disabled={page <= 1} className={cx(btn, page <= 1 && off)}>
          <ChevronLeft size={14} aria-hidden /> Prev
        </Link>
        <span className="px-2 tabular-nums">
          {page} / {pages}
        </span>
        <Link
          href={href(Math.min(pages, page + 1))}
          aria-disabled={page >= pages}
          className={cx(btn, page >= pages && off)}
        >
          Next <ChevronRight size={14} aria-hidden />
        </Link>
      </div>
    </div>
  );
}

// --- Filters ----------------------------------------------------------------

export function SegmentedTabs<K extends string>({
  tabs,
  active,
  href,
  ariaLabel,
}: {
  tabs: Array<{ key: K; label: string; count?: number }>;
  active: K;
  href: (key: K) => string;
  ariaLabel: string;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-paper-deep p-0.5"
    >
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={href(t.key)}
            aria-current={on ? 'page' : undefined}
            className={cx(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[7px] px-3 text-[13px] font-semibold transition-colors',
              on ? 'bg-card text-ink shadow-[var(--shadow-e1)]' : 'text-ink-2 hover:text-ink',
            )}
          >
            {t.label}
            {typeof t.count === 'number' && (
              <span
                className={cx(
                  'rounded-full px-1.5 py-px text-[11px] tabular-nums',
                  on ? 'bg-paper-deep text-ink-2' : 'bg-card/70 text-ink-3',
                )}
              >
                {t.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// --- Key / value ------------------------------------------------------------

export function KV({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0 py-2.5">
      <dt className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</dt>
      <dd className={cx('mt-0.5 break-words text-[13.5px] text-ink', mono && 'code')}>
        {value || <span className="text-ink-3">—</span>}
      </dd>
    </div>
  );
}

export function KVGrid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  const grid = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3' }[cols];
  return <dl className={cx('grid gap-x-6', grid)}>{children}</dl>;
}

// --- Empty ------------------------------------------------------------------

export function EmptyState({
  title,
  children,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  children?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-rule-strong bg-card/60 px-6 py-10 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-paper-deep text-ink-3">
        <Icon size={18} aria-hidden />
      </span>
      <p className="mt-3 text-[14px] font-semibold text-ink">{title}</p>
      {children && <p className="mt-1 max-w-sm text-[13px] text-ink-2">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Kept for pages that still render a bare message. */
export function Empty({ children }: { children: ReactNode }) {
  return <EmptyState title="Nothing here">{children}</EmptyState>;
}

'use client';

/**
 * Shared primitives. Three rules run through all of them:
 *   - Every tappable thing is at least 48px tall.
 *   - Any control a parent has to decide about carries a Hindi second line.
 *   - Weight comes from fill and elevation, never from thick borders. One
 *     hairline ring + the right shadow step is the whole visual language.
 */

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Check, ChevronDown, Loader2, X } from 'lucide-react';
import type { Bi } from '@/lib/labels';

import { cx } from '@/lib/cx';

export { cx };

// --- Button -----------------------------------------------------------------

type Variant = 'primary' | 'secondary' | 'danger' | 'quiet';

const VARIANTS: Record<Variant, string> = {
  // The one gradient surface in the app, with its own brand-tinted light.
  primary:
    'brand-gradient text-white shadow-[var(--shadow-brand)] hover:brightness-108 active:brightness-95',
  secondary:
    'bg-card text-ink ring-1 ring-inset ring-rule-strong shadow-[var(--shadow-e1)] hover:bg-paper hover:ring-ink-3/40',
  danger: 'bg-oxide-wash text-oxide ring-1 ring-inset ring-oxide/25 hover:bg-oxide/12',
  quiet: 'bg-transparent text-ink-2 hover:bg-paper-deep hover:text-ink',
};

export function Button({
  label,
  variant = 'secondary',
  loading = false,
  fullWidth = false,
  icon,
  className,
  children,
  ...rest
}: {
  /** Bilingual label. Pass `children` instead for one-line utility buttons. */
  label?: Bi;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        // 48px tall single-line, 52px with the Hindi line; the same two
        // heights on every screen so buttons line up with inputs and rows.
        'tap inline-flex items-center justify-center gap-2 rounded-md px-4',
        label ? 'min-h-[52px] py-1.5' : 'min-h-12 py-2.5',
        'text-base font-semibold transition-all duration-200',
        'active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        fullWidth && 'w-full',
        className,
      )}
    >
      {loading ? <Loader2 size={20} className="animate-spin" aria-hidden /> : icon}
      {label ? (
        <span className="flex flex-col items-center leading-none">
          <span className="text-[15px] leading-5">{label.en}</span>
          <span
            className={cx(
              'hindi text-[12.5px] leading-4',
              variant === 'primary' ? 'text-white/80' : 'opacity-65',
            )}
          >
            {label.hi}
          </span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

// --- Bilingual text ---------------------------------------------------------

export function BiText({ value, className }: { value: Bi; className?: string }) {
  return (
    <span className={cx('flex flex-col leading-tight', className)}>
      <span>{value.en}</span>
      <span className="hindi text-ink-3">{value.hi}</span>
    </span>
  );
}

// --- Card / surfaces --------------------------------------------------------

export function Card({
  children,
  className,
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'li' | 'article' | 'section';
}) {
  return (
    <As
      className={cx(
        'rounded-2xl bg-card ring-1 ring-rule shadow-[var(--shadow-e1)]',
        className,
      )}
    >
      {children}
    </As>
  );
}

/**
 * A section header with the small tinted icon tile modern apps use to give a
 * block an identity without a heavy title bar.
 */
export function SectionHeading({
  icon,
  title,
  hindi,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  hindi?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex items-center gap-3', className)}>
      {icon ? (
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-stamp-wash text-stamp ring-1 ring-stamp-ring"
        >
          {icon}
        </span>
      ) : null}
      <h2 className="min-w-0 flex-1 text-lg font-bold leading-tight">
        {title}
        {hindi ? <span className="hindi block font-normal text-ink-3">{hindi}</span> : null}
      </h2>
      {action}
    </div>
  );
}

/** A row from the biodata sheet: label on the left, value on the right. */
export function FieldRow({
  label,
  hindi,
  children,
}: {
  label: string;
  hindi?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-baseline gap-4 border-b border-rule py-2.5 last:border-b-0">
      <span className="w-[38%] shrink-0 text-[13px] font-medium leading-5 text-ink-3">
        {label}
        {hindi ? <span className="hindi block">{hindi}</span> : null}
      </span>
      <span className="flex-1 text-[15px] font-semibold leading-5 text-ink">{children}</span>
    </div>
  );
}

// --- Page structure ---------------------------------------------------------

/**
 * The top of every screen: a 22px title with its Hindi line, an optional
 * count in the title's own colour-3, one lead sentence at most, and a slot
 * on the right for the screen's single utility (Filters, Edit). The 16px
 * gap below it is part of the component so pages cannot drift.
 */
export function PageHeader({
  title,
  hindi,
  meta,
  lead,
  action,
  className,
}: {
  title: string;
  hindi?: string;
  /** Appended to the title in a lighter weight, e.g. "· 48". */
  meta?: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold leading-7 tracking-tight text-ink">
          {title}
          {meta ? <span className="ml-1.5 font-medium text-ink-3">{meta}</span> : null}
        </h1>
        {hindi ? <p className="hindi text-ink-3">{hindi}</p> : null}
        {lead ? <p className="mt-1.5 max-w-prose text-[15px] leading-6 text-ink-2">{lead}</p> : null}
      </div>
      {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
    </header>
  );
}

export interface SegmentItem<K extends string> {
  key: K;
  label: string;
  icon?: ReactNode;
  count?: number;
}

/**
 * The one tab switch. 44px, single line, selected segment lifts onto a card
 * surface in brand colour; a count sits in the segment as a small numeral.
 */
export function Segmented<K extends string>({
  value,
  onChange,
  items,
  label,
  className,
}: {
  value: K;
  onChange: (key: K) => void;
  items: ReadonlyArray<SegmentItem<K>>;
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cx('flex gap-1 rounded-md bg-paper-deep p-1', className)}>
      {items.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cx(
              'tap flex h-10 flex-1 items-center justify-center gap-2 rounded-[6px] px-3 text-[15px] font-semibold transition-colors',
              active ? 'bg-card text-stamp shadow-[var(--shadow-e1)]' : 'text-ink-2 hover:text-ink',
            )}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && t.count > 0 ? (
              <span
                className={cx(
                  'code grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[12px] font-semibold',
                  active ? 'bg-stamp-wash text-stamp' : 'bg-card text-ink-2',
                )}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A section label: small caps in colour-3 with the Hindi beside it, an
 * optional action on the right. Used both as a card's title and as the
 * divider between groups in a list, so the eye learns one shape.
 */
export function SectionLabel({
  en,
  hi,
  action,
  className,
}: {
  en: string;
  hi?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex min-h-8 items-center justify-between gap-3', className)}>
      <h2 className="flex flex-wrap items-baseline gap-x-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-3">
        {en}
        {hi ? <span className="hindi normal-case tracking-normal">{hi}</span> : null}
      </h2>
      {action}
    </div>
  );
}

// --- Badges & chips ---------------------------------------------------------

export function Stamp({
  tone = 'seal',
  children,
  title,
}: {
  tone?: 'seal' | 'oxide' | 'stamp' | 'ink';
  children: ReactNode;
  title?: string;
}) {
  const tones = {
    seal: 'text-seal bg-seal-wash',
    oxide: 'text-oxide bg-oxide-wash',
    stamp: 'text-stamp bg-stamp-wash',
    ink: 'text-ink-2 bg-paper-deep',
  } as const;
  return (
    <span
      title={title}
      className={cx(
        'stamped inline-flex items-center gap-1 px-2.5 py-1 text-[12px]',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Chip({
  children,
  onRemove,
  removeLabel,
}: {
  children: ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-card py-1 pl-3 pr-1 text-sm font-medium text-ink ring-1 ring-rule-strong">
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? 'Remove filter'}
          className="grid h-7 w-7 place-items-center rounded-full text-ink-3 transition-colors hover:bg-oxide-wash hover:text-oxide"
        >
          <X size={15} aria-hidden />
        </button>
      ) : null}
    </span>
  );
}

// --- Form controls ----------------------------------------------------------

/** Shared field shell so input, textarea and select never drift apart. */
const FIELD_BASE =
  'w-full rounded-xl bg-paper px-4 py-3.5 text-[17px] text-ink transition-all duration-150 ' +
  'ring-1 ring-inset placeholder:text-ink-3/70 ' +
  'focus:bg-card focus:outline-none ' +
  // A disabled field must LOOK asleep, not just refuse taps.
  'disabled:cursor-not-allowed disabled:bg-paper-deep/70 disabled:text-ink-3 disabled:ring-rule';
const FIELD_OK = 'ring-rule-strong focus:ring-2 focus:ring-stamp';
const FIELD_BAD = 'ring-oxide bg-oxide-wash/60 focus:ring-2 focus:ring-oxide';

function FieldLabel({ id, label, hindi }: { id: string; label: string; hindi?: string }) {
  return (
    // English and Hindi on ONE line, so a label is one thing to read, not two
    // stacked lines that look like a heading and a sub-heading.
    <label
      htmlFor={id}
      className="flex flex-wrap items-baseline gap-x-2 text-base font-semibold leading-tight text-ink"
    >
      {label}
      {hindi ? <span className="hindi font-normal text-ink-3">{hindi}</span> : null}
    </label>
  );
}

export function TextField({
  label,
  hindi,
  hint,
  error,
  prefix,
  className,
  ...rest
}: {
  label: string;
  hindi?: string;
  hint?: string;
  error?: string | null;
  /** Fixed text inside the field's left edge, e.g. the +91 dial code. */
  prefix?: string;
  ref?: React.Ref<HTMLInputElement>;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <FieldLabel id={id} label={label} hindi={hindi} />
      <div className="relative mt-1.5">
        {prefix ? (
          <span
            aria-hidden
            className="code pointer-events-none absolute inset-y-0 left-3.5 flex items-center border-r border-rule-strong pr-3 text-base font-semibold text-ink-2"
          >
            {prefix}
          </span>
        ) : null}
        <input
          {...rest}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={hint || error ? `${id}-help` : undefined}
          className={cx('tap', FIELD_BASE, error ? FIELD_BAD : FIELD_OK, prefix && 'pl-15')}
        />
      </div>
      {(hint || error) && (
        <p
          id={`${id}-help`}
          className={cx('mt-1.5 text-sm', error ? 'font-medium text-oxide' : 'text-ink-3')}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function TextArea({
  label,
  hindi,
  hint,
  maxLength,
  value,
  className,
  ...rest
}: {
  label: string;
  hindi?: string;
  hint?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const used = typeof value === 'string' ? value.length : 0;
  return (
    <div className={className}>
      <FieldLabel id={id} label={label} hindi={hindi} />
      <textarea
        {...rest}
        id={id}
        value={value}
        maxLength={maxLength}
        className={cx('mt-1.5', FIELD_BASE, FIELD_OK)}
      />
      <div className="mt-1.5 flex justify-between gap-3 text-sm text-ink-3">
        <span>{hint}</span>
        {maxLength ? (
          <span className="code shrink-0">
            {used}/{maxLength}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function Select({
  label,
  hindi,
  hint,
  error,
  children,
  className,
  ...rest
}: {
  label: string;
  hindi?: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={cx(className, rest.disabled && 'opacity-70')}>
      <FieldLabel id={id} label={label} hindi={hindi} />
      <div className="relative mt-1.5">
        <select
          {...rest}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={hint || error ? `${id}-help` : undefined}
          className={cx(
            'tap appearance-none pr-11',
            FIELD_BASE,
            error ? FIELD_BAD : FIELD_OK,
          )}
        >
          {children}
        </select>
        <ChevronDown
          size={18}
          strokeWidth={2.25}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3"
          aria-hidden
        />
      </div>
      {(hint || error) && (
        <p
          id={`${id}-help`}
          className={cx('mt-1.5 text-sm', error ? 'font-medium text-oxide' : 'text-ink-3')}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

/** Big checkbox row — the whole row is the target, not just the box. */
export function CheckRow({
  checked,
  onChange,
  children,
  count,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <label
      className={cx(
        'tap flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors',
        checked ? 'bg-stamp-wash' : 'hover:bg-paper',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cx(
          'grid h-6 w-6 shrink-0 place-items-center rounded-lg transition-all duration-150',
          checked
            ? 'brand-gradient text-white shadow-[var(--shadow-brand)]'
            : 'bg-card ring-1 ring-inset ring-rule-strong',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]',
        )}
      >
        {checked ? <Check size={15} strokeWidth={3} /> : null}
      </span>
      <span className="flex-1 text-[15px] leading-tight">{children}</span>
      {count !== undefined ? (
        <span className="code rounded-full bg-paper-deep px-2 py-0.5 text-[13px] text-ink-3">
          {count}
        </span>
      ) : null}
    </label>
  );
}

// --- Overlays ---------------------------------------------------------------

/**
 * Bottom sheet on mobile, centred dialog from `sm` up. Traps nothing fancy —
 * it moves focus in, restores it on close, and closes on Escape.
 */
export function Sheet({
  open,
  onClose,
  title,
  hindi,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  hindi?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        style={{ animation: 'rishta-fade-in 150ms ease-out' }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx(
          'relative flex max-h-[88vh] w-full flex-col overflow-hidden bg-card',
          'rounded-t-3xl shadow-[var(--shadow-e3)] sm:max-w-lg sm:rounded-3xl',
        )}
        style={{ animation: 'rishta-sheet-in 260ms var(--ease-out-soft)' }}
      >
        {/* Drag handle — the universal "this pulls down" cue on mobile. */}
        <div className="flex shrink-0 justify-center pt-2.5 sm:hidden" aria-hidden>
          <span className="h-1.5 w-11 rounded-full bg-rule-strong" />
        </div>
        <div className="flex items-start justify-between gap-3 border-b border-rule px-5 py-3.5">
          <h2 className="text-lg font-bold leading-tight">
            {title}
            {hindi ? <span className="hindi block font-normal text-ink-3">{hindi}</span> : null}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 -mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-2 transition-colors hover:bg-paper-deep hover:text-ink"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div
            className="border-t border-rule bg-paper/80 px-5 py-3.5"
            style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// --- Loading & empty --------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('shimmer rounded-xl', className)} aria-hidden />;
}

/** Every empty screen must say what to do next, never just "nothing here". */
export function EmptyState({
  icon,
  title,
  hindi,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  hindi?: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card px-6 py-10 text-center ring-1 ring-rule shadow-[var(--shadow-e1)]">
      <div
        className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-stamp-wash text-stamp"
        aria-hidden
      >
        {icon}
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {hindi ? <p className="hindi text-ink-3">{hindi}</p> : null}
      <p className="mx-auto mt-2 max-w-sm text-[15px] text-ink-2">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-2xl bg-oxide-wash px-4 py-3.5 text-[15px] text-oxide ring-1 ring-oxide/25"
    >
      <span className="flex-1 font-medium">{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-oxide px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:brightness-110"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

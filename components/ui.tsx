'use client';

/**
 * Shared primitives. Two rules run through all of them:
 *   - Every tappable thing is at least 48px tall.
 *   - Any control a parent has to decide about carries a Hindi second line.
 */

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Check, ChevronDown, Loader2, X } from 'lucide-react';
import type { Bi } from '@/lib/labels';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

// --- Button -----------------------------------------------------------------

type Variant = 'primary' | 'secondary' | 'danger' | 'quiet';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-stamp text-white border-stamp-ink hover:bg-stamp-ink active:bg-stamp-ink',
  secondary: 'bg-card text-ink border-rule-strong hover:bg-paper-deep',
  danger: 'bg-card text-oxide border-oxide/50 hover:bg-oxide-wash',
  quiet: 'bg-transparent text-ink-2 border-transparent hover:bg-paper-deep',
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
        'tap inline-flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5',
        'text-base font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-45',
        VARIANTS[variant],
        fullWidth && 'w-full',
        className,
      )}
    >
      {loading ? <Loader2 size={20} className="animate-spin" aria-hidden /> : icon}
      {label ? (
        <span className="flex flex-col items-center leading-tight">
          <span>{label.en}</span>
          <span className={cx('hindi', variant === 'primary' ? 'text-white/85' : 'opacity-70')}>
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

// --- Card / paper surfaces --------------------------------------------------

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
    <As className={cx('rounded-xl border border-rule bg-card shadow-card', className)}>
      {children}
    </As>
  );
}

/** A ruled row from the biodata sheet: label on the left, value on the right. */
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
    <div className="flex items-baseline gap-3 border-b border-dotted border-rule py-2.5 last:border-b-0">
      <span className="w-[38%] shrink-0 text-sm text-ink-3">
        {label}
        {hindi ? <span className="hindi block text-ink-3">{hindi}</span> : null}
      </span>
      <span className="flex-1 text-[15px] font-medium text-ink">{children}</span>
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
        'stamped inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px]',
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
    <span className="inline-flex items-center gap-1 rounded-lg border border-rule-strong bg-card py-1 pl-2.5 pr-1 text-sm text-ink">
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? 'Remove filter'}
          className="grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-paper-deep hover:text-oxide"
        >
          <X size={16} aria-hidden />
        </button>
      ) : null}
    </span>
  );
}

// --- Form controls ----------------------------------------------------------

export function TextField({
  label,
  hindi,
  hint,
  error,
  className,
  ...rest
}: {
  label: string;
  hindi?: string;
  hint?: string;
  error?: string | null;
  ref?: React.Ref<HTMLInputElement>;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[15px] font-semibold text-ink">
        {label}
        {hindi ? <span className="hindi block font-normal text-ink-3">{hindi}</span> : null}
      </label>
      <input
        {...rest}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? `${id}-help` : undefined}
        className={cx(
          'tap mt-1.5 w-full rounded-lg border-2 bg-card px-3 py-2.5 text-base text-ink',
          'placeholder:text-ink-3/70',
          error ? 'border-oxide' : 'border-rule-strong focus:border-stamp',
        )}
      />
      {(hint || error) && (
        <p
          id={`${id}-help`}
          className={cx('mt-1 text-sm', error ? 'font-medium text-oxide' : 'text-ink-3')}
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
      <label htmlFor={id} className="block text-[15px] font-semibold text-ink">
        {label}
        {hindi ? <span className="hindi block font-normal text-ink-3">{hindi}</span> : null}
      </label>
      <textarea
        {...rest}
        id={id}
        value={value}
        maxLength={maxLength}
        className="mt-1.5 w-full rounded-lg border-2 border-rule-strong bg-card px-3 py-2.5 text-base text-ink focus:border-stamp"
      />
      <div className="mt-1 flex justify-between gap-3 text-sm text-ink-3">
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
    <div className={className}>
      <label htmlFor={id} className="block text-[15px] font-semibold text-ink">
        {label}
        {hindi ? <span className="hindi block font-normal text-ink-3">{hindi}</span> : null}
      </label>
      <div className="relative mt-1.5">
        <select
          {...rest}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={hint || error ? `${id}-help` : undefined}
          className={cx(
            'tap w-full appearance-none rounded-lg border-2 bg-card px-3 py-2.5 pr-10 text-base text-ink',
            error ? 'border-oxide' : 'border-rule-strong focus:border-stamp',
          )}
        >
          {children}
        </select>
        <ChevronDown
          size={20}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
          aria-hidden
        />
      </div>
      {(hint || error) && (
        <p
          id={`${id}-help`}
          className={cx('mt-1 text-sm', error ? 'font-medium text-oxide' : 'text-ink-3')}
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
    <label className="tap flex cursor-pointer items-center gap-3 border-b border-rule px-1 py-2 last:border-b-0 hover:bg-paper">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cx(
          'grid h-6 w-6 shrink-0 place-items-center rounded-md border-2',
          checked ? 'border-stamp bg-stamp text-white' : 'border-rule-strong bg-card',
          'peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-[#1f6feb]',
        )}
      >
        {checked ? <Check size={16} strokeWidth={3} /> : null}
      </span>
      <span className="flex-1 text-[15px] leading-tight">{children}</span>
      {count !== undefined ? <span className="code text-sm text-ink-3">{count}</span> : null}
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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/45"
        style={{ animation: 'rishta-fade-in 150ms ease-out' }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl bg-card sm:max-w-lg sm:rounded-2xl"
        style={{ animation: 'rishta-sheet-in 200ms ease-out' }}
      >
        {/* Zari hairline — the sheet's version of the invitation-card foil rule */}
        <div aria-hidden className="zari h-1 w-full shrink-0" />
        <div className="flex items-start justify-between gap-3 border-b-2 border-rule px-4 py-3">
          <h2 className="text-lg font-bold leading-tight">
            {title}
            {hindi ? <span className="hindi block font-normal text-ink-3">{hindi}</span> : null}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap -mr-2 -mt-1 grid place-items-center text-ink-2 hover:text-ink"
          >
            <X size={24} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
        {footer ? (
          <div className="border-t-2 border-rule bg-paper px-4 py-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

// --- Loading & empty --------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx('rounded-lg bg-paper-deep', className)}
      style={{ animation: 'rishta-pulse 1.6s ease-in-out infinite' }}
      aria-hidden
    />
  );
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
    <div className="rounded-xl border-2 border-dashed border-rule-strong bg-card px-6 py-12 text-center">
      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-paper-deep text-ink-2">
        {icon}
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {hindi ? <p className="hindi text-ink-3">{hindi}</p> : null}
      <p className="mx-auto mt-2 max-w-sm text-[15px] text-ink-2">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-oxide/40 bg-oxide-wash px-4 py-3 text-[15px] text-oxide"
    >
      <span className="flex-1 font-medium">{message}</span>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="tap font-bold underline">
          Try again
        </button>
      ) : null}
    </div>
  );
}

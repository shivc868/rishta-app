'use client';

/**
 * Interactive admin primitives. ActionForm wraps a server action with
 * useActionState so the outcome shows inline without a page reload.
 * Everything presentational lives in ./ui.tsx and is re-exported here so
 * older imports keep working.
 */

import { useActionState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cx } from '@/lib/cx';
import type { ActionResult } from '@/app/admin/actions';

export { StatTile, StatusBadge, ReportBadge, Table, Empty } from './ui';
export { inputClass } from './styles';

type ServerAction = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

/**
 * A form bound to a server action. Hidden fields go in `fields`; visible
 * controls in `children`. Shows the result message under the button.
 */
export function ActionForm({
  action,
  fields = {},
  children,
  submitLabel,
  variant = 'secondary',
  size = 'md',
  className,
  inline = false,
  fullWidth = false,
}: {
  action: ServerAction;
  fields?: Record<string, string>;
  children?: ReactNode;
  submitLabel: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'quiet';
  size?: 'sm' | 'md';
  className?: string;
  inline?: boolean;
  fullWidth?: boolean;
}) {
  const [result, formAction, pending] = useActionState(action, null);

  const styles = {
    primary: 'brand-gradient text-white shadow-[var(--shadow-brand)] hover:brightness-105',
    secondary: 'bg-card text-ink ring-1 ring-inset ring-rule-strong hover:bg-paper',
    danger: 'bg-oxide text-white hover:brightness-105',
    quiet: 'bg-transparent text-ink-2 ring-1 ring-inset ring-transparent hover:bg-paper-deep hover:text-ink',
  };
  const sizes = {
    sm: 'h-8 px-3 text-[12.5px]',
    md: 'h-9 px-3.5 text-[13.5px]',
  };

  return (
    <form
      action={formAction}
      className={cx(inline ? 'inline-flex flex-col gap-1' : 'space-y-2.5', className)}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {children}
      <button
        type="submit"
        disabled={pending}
        className={cx(
          'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all disabled:opacity-45',
          styles[variant],
          sizes[size],
          fullWidth && 'w-full',
        )}
      >
        {pending && <Loader2 size={14} className="animate-spin" aria-hidden />}
        {submitLabel}
      </button>
      {result && (
        <p role="status" className={cx('text-[12.5px] font-medium', result.ok ? 'text-seal' : 'text-oxide')}>
          {result.message}
        </p>
      )}
    </form>
  );
}

'use client';

import { Lock } from 'lucide-react';
import { gradientFromToken } from '@/lib/labels';
import { cx } from './ui';

/**
 * The photo slot. It is ALWAYS the same box, locked or unlocked, so nothing
 * moves when a grant lands — no layout shift, and no "something appeared" jolt.
 *
 * Locked state is a blurred two-hue gradient generated from the profile's own
 * token. It is deliberately not a silhouette and not a grey box: a parent must
 * be able to see at a glance that a photo exists and is being withheld.
 */
export function PhotoFrame({
  token,
  locked,
  size = 'md',
  label,
  className,
}: {
  token: string | undefined;
  locked: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}) {
  const sizes = {
    sm: 'h-16 w-16',
    // Narrower at the 360px baseline — on a cheap phone the text column matters
    // more than the size of a box that is deliberately showing nothing.
    md: 'h-24 w-20 sm:h-28 sm:w-24',
    lg: 'aspect-[3/4] w-full',
  };
  // Warm rose-to-gold fallback so the locked placeholder sits in the wedding
  // palette instead of fighting it with a cold blue.
  const background = gradientFromToken(token ?? 'grad:343:36');

  return (
    <div
      className={cx(
        'relative shrink-0 overflow-hidden border-2 border-rule-strong bg-paper-deep',
        sizes[size],
        className,
      )}
      role="img"
      aria-label={locked ? (label ?? 'Photo is private') : (label ?? 'Photo')}
    >
      <div
        aria-hidden
        className={cx('absolute inset-0', locked && 'photo-withheld')}
        style={{ background }}
      />
      {locked ? (
        <div className="absolute inset-0 grid place-items-center bg-ink/25 text-white">
          <span className="flex flex-col items-center gap-1 text-center">
            <Lock size={size === 'sm' ? 16 : 22} aria-hidden strokeWidth={2.5} />
            {size !== 'sm' ? (
              <span className="px-1 text-[11px] font-bold uppercase leading-tight tracking-wide">
                Private
              </span>
            ) : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}

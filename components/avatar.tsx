'use client';

/**
 * Gender avatars for list rows. A girl's card shows a girl silhouette, a
 * boy's card a boy silhouette — warm, brand-tinted, and obviously not a
 * photograph, so the photo-privacy promise stays intact without stamping
 * "PRIVATE" on every card.
 */

import type { Gender } from '@/types';
import { cx } from './ui';

function GirlIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="currentColor">
      {/* hair frame */}
      <path d="M24 6c-8.8 0-14 6.4-14 14.5 0 4.6 1 8 2.2 10.3l3.6-1.1c-.7-2.6-.8-5.3-.8-7.7 0-6.2 3.4-9.5 9-9.5s9 3.3 9 9.5c0 2.4-.1 5.1-.8 7.7l3.6 1.1C37 28.5 38 25.1 38 20.5 38 12.4 32.8 6 24 6z" />
      <circle cx="24" cy="20" r="6.2" />
      <path d="M9.5 42c1.6-7.2 7.3-11 14.5-11s12.9 3.8 14.5 11v1h-29z" />
    </svg>
  );
}

function BoyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="currentColor">
      {/* short hair cap */}
      <path d="M16 16.5c0-5.5 3.6-9 8-9s8 3.5 8 9c-2.6-2.1-5-3-8-3s-5.4.9-8 3z" />
      <circle cx="24" cy="19" r="6.6" />
      <path d="M9.5 42c1.6-7.2 7.3-11 14.5-11s12.9 3.8 14.5 11v1h-29z" />
    </svg>
  );
}

export function GenderAvatar({
  gender,
  size = 'md',
  className,
}: {
  gender: Gender;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = { xs: 'h-14 w-14', sm: 'h-16 w-16', md: 'h-20 w-20 sm:h-24 sm:w-24', lg: 'h-28 w-28' };
  const iconSizes = { xs: 'h-8 w-8', sm: 'h-9 w-9', md: 'h-11 w-11 sm:h-13 sm:w-13', lg: 'h-16 w-16' };
  const female = gender === 'female';
  return (
    <div
      role="img"
      aria-label={female ? 'Girl — photo stays private' : 'Boy — photo stays private'}
      className={cx(
        // Flat tints only. A gradient here fought with every surface it sat on.
        'grid shrink-0 place-items-center rounded-2xl',
        female
          ? 'bg-stamp-wash text-stamp ring-1 ring-stamp-ring'
          : 'bg-paper-deep text-ink-2 ring-1 ring-rule-strong',
        sizes[size],
        className,
      )}
    >
      {female ? <GirlIcon className={iconSizes[size]} /> : <BoyIcon className={iconSizes[size]} />}
    </div>
  );
}

/**
 * Wedding-card ornaments, drawn in code so they ship with no image request
 * and recolour with the theme. All strokes use currentColor; set the colour
 * (normally `text-gold`) on the parent.
 */

import { cx } from '@/lib/cx';

/**
 * A line-art Ganesha, in the spare style printed at the head of a wedding
 * card: crown, head with the two ears, the trunk curling to the left, the
 * round body and a single raised hand in blessing. Decorative, so hidden
 * from screen readers; the "श्री गणेशाय नमः" line beside it carries the meaning.
 */
export function GaneshMark({ className, size = 72 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {/* crown */}
      <path d="M38 27 L50 9 L62 27" />
      <path d="M44 22 L50 14 L56 22" />
      <circle cx={50} cy={25.5} r={1.6} fill="currentColor" stroke="none" />
      {/* ears */}
      <path d="M36 33 C24 28 19 44 29 50 C32 52 35 50 36 47" />
      <path d="M64 33 C76 28 81 44 71 50 C68 52 65 50 64 47" />
      {/* head */}
      <path d="M36 33 C36 24 64 24 64 33 C66 42 62 50 56 52 L44 52 C38 50 34 42 36 33 Z" />
      {/* eyes */}
      <circle cx={44.5} cy={38.5} r={1.5} fill="currentColor" stroke="none" />
      <circle cx={55.5} cy={38.5} r={1.5} fill="currentColor" stroke="none" />
      {/* trunk — curls to the left, the auspicious side */}
      <path d="M50 46 C51 56 48 62 42 66 C37 69 34 74 37 78 C39 81 44 80 45 76" />
      {/* tusk */}
      <path d="M55 52 C58 55 60 58 59 61" />
      {/* body */}
      <path d="M40 58 C28 66 28 86 42 90 L58 90 C72 86 72 66 60 58" />
      {/* belly line */}
      <path d="M44 74 C48 77 52 77 56 74" />
      {/* blessing hand, right */}
      <path d="M62 64 C70 60 74 54 73 48" />
      <path d="M71 47 L73 44 M73 48 L76 46 M74 50 L77 50" />
      {/* resting hand, left (behind the trunk) */}
      <path d="M38 66 C32 66 29 70 30 74" />
      {/* seat */}
      <path d="M30 92 L70 92" />
      <path d="M26 96 L74 96" strokeWidth={1.4} />
    </svg>
  );
}

/**
 * The invocation that opens a wedding card. Gold, Devanagari, with the
 * double-danda marks on either side.
 */
export function Invocation({ className }: { className?: string }) {
  return (
    <p
      lang="hi"
      className={cx('text-center text-[15px] font-semibold tracking-wide text-gold', className)}
      style={{ fontFamily: 'var(--font-hindi)' }}
    >
      ॥ श्री गणेशाय नमः ॥
    </p>
  );
}

/**
 * A thin gold rule with a small lozenge at its centre — the divider printed
 * between the sections of a card.
 */
export function GoldRule({ className }: { className?: string }) {
  return (
    <div className={cx('flex items-center gap-3 text-gold', className)} aria-hidden>
      <span className="h-px flex-1 bg-linear-to-r from-transparent via-gold/70 to-gold/70" />
      <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0">
        <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="currentColor" />
      </svg>
      <span className="h-px flex-1 bg-linear-to-l from-transparent via-gold/70 to-gold/70" />
    </div>
  );
}

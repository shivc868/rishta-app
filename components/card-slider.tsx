'use client';

/**
 * One profile at a time, side to side. A horizontal strip that snaps card to
 * card: swipe on a phone, arrow buttons or trackpad on a desktop. The counter
 * ("3 / 49") is the only hint of how many are left.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '@/lib/cx';

export function CardSlider({
  count,
  children,
  label = 'Profiles',
}: {
  count: number;
  children: ReactNode;
  label?: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  // Which card is in view: the child whose left edge is nearest the scroll
  // position. Measured from the children, so the gap between cards never
  // makes the counter drift.
  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const kids = Array.from(el.children) as HTMLElement[];
    let best = 0;
    let bestDist = Infinity;
    kids.forEach((k, i) => {
      const d = Math.abs(k.offsetLeft - el.scrollLeft);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setIndex(best);
  }, []);

  // A new result set starts from the first card.
  useEffect(() => {
    trackRef.current?.scrollTo({ left: 0 });
    setIndex(0);
  }, [count]);

  function go(delta: number) {
    const el = trackRef.current;
    if (!el) return;
    const target = el.children[index + delta] as HTMLElement | undefined;
    if (target) el.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
  }

  const canPrev = index > 0;
  const canNext = index < count - 1;

  return (
    <div className="relative">
      <ul
        ref={trackRef}
        onScroll={onScroll}
        aria-label={label}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 scroll-pl-4 md:mx-0 md:px-0 md:scroll-pl-0"
      >
        {children}
      </ul>

      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={!canPrev}
          aria-label="Previous profile"
          className={cx(
            'tap grid h-10 w-10 place-items-center rounded-full bg-card text-ink-2 ring-1 ring-rule shadow-[var(--shadow-e1)]',
            'transition-colors hover:text-stamp disabled:opacity-30',
          )}
        >
          <ChevronLeft size={22} aria-hidden />
        </button>
        <p className="code text-sm font-semibold text-ink-2" aria-live="polite">
          {index + 1} / {count}
        </p>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={!canNext}
          aria-label="Next profile"
          className={cx(
            'tap grid h-10 w-10 place-items-center rounded-full bg-card text-ink-2 ring-1 ring-rule shadow-[var(--shadow-e1)]',
            'transition-colors hover:text-stamp disabled:opacity-30',
          )}
        >
          <ChevronRight size={22} aria-hidden />
        </button>
      </div>
    </div>
  );
}

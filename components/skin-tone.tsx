'use client';

/**
 * The skin-tone picker. Skin tone is the one biodata fact words describe
 * badly — "wheatish" means a different thing in every household — so the
 * input IS the answer: seven real swatches on a warm strip, tap the one that
 * matches. The name confirms the choice; the colour makes it.
 */

import { Check } from 'lucide-react';
import type { Complexion } from '@/types';
import { COMPLEXION_LABELS, COMPLEXION_SWATCH } from '@/lib/labels';
import { cx } from './ui';

const TONES = Object.keys(COMPLEXION_SWATCH) as Complexion[];

/** A lit swatch: soft top-left highlight so it reads as skin, not paint. */
function swatchBackground(tone: Complexion): string {
  return `radial-gradient(circle at 32% 28%, rgb(255 255 255 / 0.38), transparent 58%), ${COMPLEXION_SWATCH[tone]}`;
}

export function SkinTonePicker({
  value,
  onChange,
  error,
  className,
}: {
  value: Complexion | undefined;
  onChange: (tone: Complexion) => void;
  error?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <span
        id="skin-tone-label"
        className="flex flex-wrap items-baseline gap-x-2 text-[15px] font-semibold leading-tight text-ink"
      >
        Skin tone
      </span>

      <div
        role="radiogroup"
        aria-labelledby="skin-tone-label"
        className={cx(
          'mt-2 rounded-xl bg-paper px-3 py-3 ring-1 ring-inset',
          error ? 'ring-oxide' : 'ring-rule-strong',
        )}
      >
        <div className="grid grid-cols-7 place-items-center gap-1">
          {TONES.map((tone) => {
            const active = tone === value;
            return (
              <button
                key={tone}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={COMPLEXION_LABELS[tone].en}
                title={COMPLEXION_LABELS[tone].en}
                onClick={() => onChange(tone)}
                className={cx(
                  // Fluid: one seventh of the row, capped at 44px — seven always
                  // fit on one line, even on a 320px phone.
                  'relative grid aspect-square w-full max-w-11 place-items-center rounded-full',
                  'transition-transform duration-150 active:scale-90',
                  active ? 'scale-110' : 'hover:scale-105',
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    'grid h-[84%] w-[84%] place-items-center rounded-full shadow-[inset_0_-2px_4px_rgb(0_0_0/0.12)]',
                    'ring-offset-2 ring-offset-card transition-all duration-150',
                    active ? 'ring-2 ring-stamp' : 'ring-1 ring-ink/10',
                  )}
                  style={{ background: swatchBackground(tone) }}
                >
                  {active ? (
                    <Check
                      size={16}
                      strokeWidth={3.5}
                      className="text-white drop-shadow-[0_1px_1px_rgb(0_0_0/0.45)]"
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        {/* The chosen tone, named — confirmation that the tap registered. */}
        <p className="mt-2.5 border-t border-rule pt-2 text-center text-sm" aria-live="polite">
          {value ? (
            <span className="font-semibold text-ink">
              {COMPLEXION_LABELS[value].en}
            </span>
          ) : (
            <span className="text-ink-3">Tap the shade that matches</span>
          )}
        </p>
      </div>

      {error ? <p className="mt-1.5 text-sm font-medium text-oxide">{error}</p> : null}
    </div>
  );
}

/** Small colour dot for read-only rows — the swatch travels with the label. */
export function SkinToneDot({ tone }: { tone: Complexion }) {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 shrink-0 self-center rounded-full ring-1 ring-ink/15"
      style={{ background: swatchBackground(tone) }}
    />
  );
}

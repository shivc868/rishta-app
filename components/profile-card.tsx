'use client';

/**
 * A register entry. This is the one component that renders profiles in a list,
 * and it can only render `Profile` — the public row. It has no access to a
 * name, a photo or a number, so it cannot leak one.
 *
 * Deliberately spare: no avatar, no code, no badge clutter — just the facts a
 * family compares first (age · height · weight, job type, religion · jati,
 * marital status, place) and one clear "View biodata" call. The whole card is
 * one link (the vitals line stretches over it). Saving is the heart button.
 */

import Link from 'next/link';
import { ChevronRight, Heart, MapPin } from 'lucide-react';
import type { BrowseCard } from '@/types';
import {
  INCOME_SHORT,
  MARITAL_LABELS,
  OCCUPATION_LABELS,
  RELIGION_LABELS,
  STAGE_LABELS,
  formatHeightShort,
  formatWeightBand,
} from '@/lib/labels';
import { Card, Stamp, cx } from './ui';

export function ProfileCardItem({
  card,
  onToggleSave,
  saving = false,
}: {
  card: BrowseCard;
  onToggleSave?: (id: string) => void;
  saving?: boolean;
}) {
  const { profile, age, distanceKm } = card;
  const stageShown = card.stage !== 'browsing';

  return (
    <Card
      as="li"
      className="group relative transition-all hover:-translate-y-0.5 hover:border-stamp/40 hover:shadow-[0_4px_16px_rgb(59_36_48/0.12)]"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* A mini biodata sheet: one fact per ruled row, labels in a fixed
              column so nothing sits uneven. The important rows read in maroon. */}
          <div className="min-w-0 flex-1">
            <Link
              href={`/profile/${profile.publicCode}`}
              className="block after:absolute after:inset-0 after:content-['']"
            >
              <span className="sr-only">View biodata of profile {profile.publicCode}</span>
            </Link>
            <dl>
              <CardRow label="Age" hindi="उम्र" big>
                {age} yrs
              </CardRow>
              <CardRow label="Height" hindi="कद">
                {formatHeightShort(profile.heightCm)}
              </CardRow>
              <CardRow label="Weight" hindi="वज़न">
                {formatWeightBand(profile.weightBand)}
              </CardRow>
              <CardRow label="Dharm · Jaati" hindi="धर्म · जाति" highlight>
                {RELIGION_LABELS[profile.religion].en} · {profile.community}
              </CardRow>
              <CardRow label="Job type" hindi="नौकरी" highlight>
                {OCCUPATION_LABELS[profile.occupationCategory].en}
              </CardRow>
            </dl>
          </div>

          {onToggleSave ? (
            <button
              type="button"
              onClick={() => onToggleSave(profile.id)}
              disabled={saving}
              aria-pressed={card.isShortlisted}
              aria-label={
                card.isShortlisted
                  ? `Remove ${profile.publicCode} from saved`
                  : `Save ${profile.publicCode}`
              }
              className={cx(
                'tap relative z-10 -mr-1.5 -mt-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-full',
                card.isShortlisted
                  ? 'bg-stamp-wash text-stamp'
                  : 'text-ink-3 hover:bg-paper hover:text-stamp',
              )}
            >
              <Heart
                size={22}
                aria-hidden
                className={card.isShortlisted ? 'fill-current' : undefined}
              />
            </button>
          ) : null}
        </div>

        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          <InfoChip>{MARITAL_LABELS[profile.maritalStatus].en}</InfoChip>
          <InfoChip>{INCOME_SHORT[profile.incomeBand]}</InfoChip>
          {stageShown ? (
            <li>
              <Stamp tone={card.stage === 'connected' ? 'seal' : 'stamp'}>
                {STAGE_LABELS[card.stage].en}
              </Stamp>
            </li>
          ) : null}
        </ul>

        <div className="mt-3 flex items-center gap-1.5 border-t border-dotted border-rule pt-2.5 text-sm text-ink-2">
          <MapPin size={15} className="shrink-0 text-stamp" aria-hidden />
          <span className="min-w-0 truncate font-medium">
            {profile.city}, {profile.state}
            {distanceKm > 0 ? ` · ${distanceKm} km` : ''}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-0.5 font-bold text-stamp transition-transform group-hover:translate-x-0.5">
            View biodata
            <ChevronRight size={16} aria-hidden />
          </span>
        </div>
      </div>
    </Card>
  );
}

/** One ruled row of the mini biodata: fixed label column, bold value. */
function CardRow({
  label,
  hindi,
  children,
  big = false,
  highlight = false,
}: {
  label: string;
  hindi: string;
  children: React.ReactNode;
  big?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 border-b border-dotted border-rule py-1.5 last:border-b-0">
      <dt className="w-26 shrink-0 text-[13px] font-medium text-ink-3">
        {label}
        <span className="hindi block leading-tight">{hindi}</span>
      </dt>
      <dd
        className={cx(
          'min-w-0 flex-1 font-bold leading-tight',
          big ? 'text-lg' : 'text-[15px]',
          highlight ? 'text-stamp' : 'text-ink',
        )}
      >
        {children}
      </dd>
    </div>
  );
}

function InfoChip({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-full bg-paper-deep px-2.5 py-1 text-[13px] font-semibold text-ink-2">
      {children}
    </li>
  );
}

export function ProfileCardSkeleton() {
  return (
    <li className="rounded-xl border border-rule bg-card p-4" aria-hidden>
      <div className="space-y-2">
        <div
          className="h-6 w-2/3 rounded bg-paper-deep"
          style={{ animation: 'rishta-pulse 1.6s ease-in-out infinite' }}
        />
        <div
          className="h-4 w-1/3 rounded bg-paper-deep"
          style={{ animation: 'rishta-pulse 1.6s ease-in-out infinite' }}
        />
        <div
          className="h-7 w-full rounded-full bg-paper-deep"
          style={{ animation: 'rishta-pulse 1.6s ease-in-out infinite' }}
        />
        <div
          className="h-5 w-3/4 rounded bg-paper-deep"
          style={{ animation: 'rishta-pulse 1.6s ease-in-out infinite' }}
        />
      </div>
    </li>
  );
}

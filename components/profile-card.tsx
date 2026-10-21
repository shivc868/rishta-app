'use client'

/**
 * A register entry, built to be looked at one at a time.
 *
 * On a phone each card is tall enough to own the screen, and the page snaps
 * to the next card as the family scrolls — one profile, one decision. It can
 * only render `Profile` (the public row), so it has no access to a name, a
 * photo or a number and cannot leak one.
 *
 * Layout, top to bottom:
 *   1. Hero — tinted field with the gender silhouette, the age + height
 *      headline, the place, and the verified / stage stamps.
 *   2. Four big tiles — the facts a family checks first. Which four depends
 *      on who is being looked at: for a boy, work and income lead; for a
 *      girl, education leads.
 *   3. The remaining facts as small tags.
 *   4. One action: View biodata. Saving is the heart in the hero.
 */

import Link from 'next/link'
import {
  BriefcaseBusiness,
  ChevronRight,
  GraduationCap,
  Heart,
  IndianRupee,
  MapPin,
  Ruler,
  Scale,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import type {BrowseCard, Profile} from '@/types'
import {
  CATEGORY_LABELS,
  COMPLEXION_LABELS,
  EDUCATION_SHORT,
  INCOME_SHORT,
  MANGLIK_LABELS,
  MARITAL_LABELS,
  OCCUPATION_LABELS,
  RELIGION_LABELS,
  STAGE_LABELS,
  describeProfileHindi,
  formatHeightShort,
  formatWeightBand,
} from '@/lib/labels'
import {GenderAvatar} from './avatar'
import {SkinToneDot} from './skin-tone'
import {Card, Stamp, cx} from './ui'

type Icon = typeof Users

interface Fact {
  key: string
  label: string
  icon: Icon
  value: React.ReactNode
}

/** Every public fact, keyed, so the two gender orders below can pick from one list. */
function facts(p: Profile): Record<string, Fact> {
  return {
    education: {
      key: 'education',
      label: 'Education',
      icon: GraduationCap,
      value: p.educationLevel === 'other' ? p.education : EDUCATION_SHORT[p.educationLevel],
    },
    job: {
      key: 'job',
      label: 'Job',
      icon: BriefcaseBusiness,
      value: OCCUPATION_LABELS[p.occupationCategory].en,
    },
    income: {
      key: 'income',
      label: 'Income',
      icon: IndianRupee,
      value: INCOME_SHORT[p.incomeBand],
    },
    religion: {
      key: 'religion',
      label: 'Dharm · Jaati',
      icon: Users,
      value: `${RELIGION_LABELS[p.religion].en} · ${p.community}`,
    },
    category: {
      key: 'category',
      label: 'Category',
      icon: Users,
      value: `${CATEGORY_LABELS[p.category].en} category`,
    },
    marital: {
      key: 'marital',
      label: 'Marital status',
      icon: UserRound,
      value: MARITAL_LABELS[p.maritalStatus].en,
    },
    manglik: {
      key: 'manglik',
      label: 'Manglik',
      icon: Sparkles,
      value: MANGLIK_LABELS[p.manglik].en,
    },
    weight: {
      key: 'weight',
      label: 'Weight',
      icon: Scale,
      value: formatWeightBand(p.weightBand),
    },
    skin: {
      key: 'skin',
      label: 'Skin tone',
      icon: UserRound,
      value: (
        <span className="inline-flex items-center gap-2">
          <SkinToneDot tone={p.complexion} />
          {COMPLEXION_LABELS[p.complexion].en}
        </span>
      ),
    },
    height: {
      key: 'height',
      label: 'Height',
      icon: Ruler,
      value: formatHeightShort(p.heightCm),
    },
  }
}

/**
 * What leads, by who is on the card. A boy's card is read for earning first;
 * a girl's card for education first. Everything else is in the Hindi line.
 */
const LEAD: Record<Profile['gender'], string[]> = {
  male: ['job', 'income', 'education', 'religion'],
  female: ['education', 'job', 'religion', 'marital'],
}

export function ProfileCardItem({
  card,
  onToggleSave,
  saving = false,
  slide = false,
}: {
  card: BrowseCard
  onToggleSave?: (id: string) => void
  saving?: boolean
  /** Inside a CardSlider: one full-width snap item, with a gap to the next. */
  slide?: boolean
}) {
  const {profile, age} = card
  const all = facts(profile)
  const lead = LEAD[profile.gender].map((k) => all[k])
  const stageShown = card.stage !== 'browsing'
  // Everything the card prints above the paragraph, so the paragraph skips it.
  const shown = new Set(['age', 'height', 'city', ...LEAD[profile.gender]])

  return (
    <Card
      as="li"
      className={cx(
        'lift group relative overflow-hidden hover:shadow-[var(--shadow-e2)] hover:ring-rule-strong',
        slide && 'w-full shrink-0 snap-start md:max-w-md',
      )}
    >
      {/* Whole card opens the biodata; the heart sits above this overlay. */}
      <Link
        href={`/profile/${profile.publicCode}`}
        className="absolute inset-0 z-[1] rounded-2xl focus-visible:outline-none"
      >
        <span className="sr-only">View biodata of profile {profile.publicCode}</span>
      </Link>

      {/* --- 1. Identity row ----------------------------------------------------
          One flat surface. Age is the headline, place the second line, the
          register code the quiet third. The heart is a 40px flat control
          aligned to the headline's cap height, not floating in a corner. */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-3.5">
        <GenderAvatar gender={profile.gender} size="xs" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="display text-[22px] leading-7 text-ink">
              {age} yrs
              <span className="ml-2 text-[15px] font-semibold text-ink-2">
                {formatHeightShort(profile.heightCm)}
              </span>
            </p>
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
                  'tap relative z-10 -mr-1.5 -mt-1.5 grid h-10 w-10 shrink-0 place-items-center rounded-full',
                  'transition-colors duration-150 active:scale-95',
                  card.isShortlisted
                    ? 'bg-stamp-wash text-stamp'
                    : 'text-ink-3 hover:bg-paper-deep hover:text-stamp',
                )}
              >
                <Heart size={20} aria-hidden className={card.isShortlisted ? 'fill-current' : undefined} />
              </button>
            ) : null}
          </div>
          <p className="flex items-center gap-1 text-[15px] leading-6 text-ink-2">
            <MapPin size={14} className="shrink-0 text-ink-3" aria-hidden />
            <span className="truncate">
              <span className="font-semibold text-ink">{profile.city}</span>, {profile.district}
            </span>
          </p>
          {stageShown ? (
            <div className="mt-1.5">
              <Stamp tone={card.stage === 'number_shared' ? 'seal' : 'stamp'}>
                {STAGE_LABELS[card.stage].en}
              </Stamp>
            </div>
          ) : null}
        </div>
      </div>

      {/* --- 2. Lead facts ------------------------------------------------------
          A key–value list on hairlines, not boxes inside a box. Label and value
          share one baseline; rows are a steady 44px so four of them read as
          one block. */}
      <dl className="mx-4 border-y border-rule">
        {lead.map((f) => (
          <div
            key={f.key}
            className="flex min-h-10 items-center justify-between gap-4 border-b border-rule py-2 last:border-b-0"
          >
            <dt className="flex shrink-0 items-center gap-2 text-[13px] font-medium text-ink-3">
              <f.icon size={15} aria-hidden />
              {f.label}
            </dt>
            <dd className="min-w-0 text-right text-[15px] font-semibold leading-5 text-ink">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* --- 3. The biodata read out, then the one action ----------------------- */}
      <div className="space-y-3 p-4">
        <p
          lang="hi"
          className="text-[14.5px] leading-[22px] text-ink-2"
          style={{fontFamily: 'var(--font-hindi)'}}
        >
          {describeProfileHindi(profile, age, shown)}
        </p>

        <span
          aria-hidden
          className="brand-gradient flex min-h-11 items-center justify-center gap-1.5 rounded-md text-base font-semibold text-white shadow-[var(--shadow-brand)] transition-all duration-200 group-hover:brightness-108"
        >
          View biodata
          <ChevronRight size={18} />
        </span>
      </div>
    </Card>
  )
}

export function ProfileCardSkeleton() {
  return (
    <li className="overflow-hidden rounded-2xl bg-card ring-1 ring-rule" aria-hidden>
      <div className="flex items-center gap-3 px-4 pb-3 pt-3.5">
        <div className="shimmer h-14 w-14 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="shimmer h-6 w-2/5 rounded-md" />
          <div className="shimmer h-4 w-3/5 rounded-md" />
        </div>
      </div>
      <div className="mx-4 border-y border-rule">
        {Array.from({length: 4}, (_, i) => (
          <div key={i} className="flex h-10 items-center justify-between border-b border-rule last:border-b-0">
            <div className="shimmer h-3.5 w-20 rounded-md" />
            <div className="shimmer h-4 w-28 rounded-md" />
          </div>
        ))}
      </div>
      <div className="space-y-3 p-4">
        <div className="space-y-2">
          <div className="shimmer h-4 w-full rounded-md" />
          <div className="shimmer h-4 w-11/12 rounded-md" />
          <div className="shimmer h-4 w-4/5 rounded-md" />
        </div>
        <div className="shimmer h-11 w-full rounded-xl" />
      </div>
    </li>
  )
}

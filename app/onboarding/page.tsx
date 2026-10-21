'use client'

/**
 * The biodata form. One page, modelled on the printed sheet families already
 * fill in and in the same order: basic details, then education and work, then
 * community and city. No wizard — everything is visible at once, so a family
 * can see how much is left and go back to fix a line without losing their place.
 *
 * Layout: three numbered cards, each with its own header strip, a 3-segment
 * progress bar that fills as a card is completed, and one sticky action bar.
 * Every label is English + Hindi on a single line so a field reads as one
 * thing to fill, not a heading with a sub-heading.
 */

import {useEffect, useMemo, useState} from 'react'
import {useRouter} from 'next/navigation'
import {Check, CircleAlert} from 'lucide-react'
import * as api from '@/lib/api'
import {ApiError, type ProfileDraft} from '@/lib/api'
import {Button, Card, Select, Sheet, TextField, cx} from '@/components/ui'
import {SkinTonePicker} from '@/components/skin-tone'
import {StateDistrictTehsilField} from '@/components/city-field'
import {DobField} from '@/components/dob-field'
import {useSession, useToast} from '@/components/providers'
import {
  EDUCATION_LEVEL_LABELS,
  RELIGION_LABELS,
  CATEGORY_LABELS,
  EDUCATION_SHORT,
  INCOME_LABELS,
  MANGLIK_LABELS,
  MARITAL_LABELS,
  OCCUPATION_LABELS,
  WEIGHT_BANDS,
  HEIGHT_OPTIONS,
  formatWeightBand,
} from '@/lib/labels'
import type {
  CreatedFor,
  Religion,
  SocialCategory,
  Diet,
  EducationLevel,
  Gender,
  IncomeBand,
  Manglik,
  Complexion,
  MaritalStatus,
  OccupationCategory,
} from '@/types'

type Draft = Partial<ProfileDraft> & {createdFor: CreatedFor}

/** Legal marriage age: 21 for a boy, 18 for a girl. */
function minAgeFor(gender: Gender | undefined): number {
  return gender === 'male' ? 21 : 18
}

/** What each validated field is called in the "you missed this" popup, in form order. */
const FIELD_NAMES: Record<string, string> = {
  dob: 'Date of birth',
  heightCm: 'Height',
  weightBand: 'Weight',
  complexion: 'Skin tone',
  educationLevel: 'Education',
  education: 'Education',
  occupationCategory: 'Job type',
  incomeBand: 'Monthly income',
  religion: 'Religion',
  category: 'Category',
  community: 'Jati',
  city: 'State, district and tehsil',
}

/** Scroll a field into view and move focus into it, so the popup lands the parent on the gap. */
function goToField(key: string) {
  const el = document.querySelector<HTMLElement>(`[data-field="${key}"]`)
  if (!el) return
  el.scrollIntoView({behavior: 'smooth', block: 'center'})
  el.querySelector<HTMLElement>('select, input, button, [tabindex]')?.focus({preventScroll: true})
}

const EMPTY: Draft = {
  createdFor: 'daughter',
  gender: 'female',
  complexion: 'wheatish',
  diet: 'vegetarian',
  manglik: 'unknown',
  maritalStatus: 'never_married',
}

/** Which of the three cards are fully filled — drives the progress bar and the ticks. */
function sectionsDone(d: Draft): [boolean, boolean, boolean] {
  const s1 = Boolean(d.dob && d.heightCm && d.weightBand && d.complexion)
  const s2 = Boolean(
    d.educationLevel &&
    (d.educationLevel !== 'other' || d.education?.trim()) &&
    d.occupationCategory &&
    (d.occupationCategory === 'not_working' || d.incomeBand),
  )
  const s3 = Boolean(
    d.religion &&
    d.category &&
    d.community?.trim() &&
    d.state &&
    d.district &&
    d.city &&
    d.cityLat !== undefined,
  )
  return [s1, s2, s3]
}

export default function OnboardingPage() {
  const router = useRouter()
  const {push} = useToast()
  const {ready, isSignedIn, refresh} = useSession()

  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  /** Keys of the fields the last submit found empty — drives the popup. */
  const [missing, setMissing] = useState<string[] | null>(null)

  const done = useMemo(() => sectionsDone(draft), [draft])

  useEffect(() => {
    if (ready && !isSignedIn) router.replace('/login')
  }, [ready, isSignedIn, router])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({...d, [key]: value}))
    setErrors((e) => {
      if (!e[key as string]) return e
      const next = {...e}
      delete next[key as string]
      return next
    })
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    {
      if (!draft.dob) e.dob = 'Choose the date of birth as written on the certificate.'
      else {
        const age = api.ageFromDob(draft.dob)
        const minAge = minAgeFor(draft.gender)
        if (age < minAge)
          e.dob = `A ${draft.gender === 'male' ? 'boy' : 'girl'} must be ${minAge} or older to be listed here.`
        if (age > 70) e.dob = 'Check the year — this date gives an age above 70.'
      }
      if (!draft.heightCm) e.heightCm = 'Choose a height from the list.'
      if (!draft.weightBand) e.weightBand = 'Choose the weight from the list.'
      if (!draft.complexion) e.complexion = 'Choose the skin tone from the list.'
    }
    {
      if (!draft.educationLevel) e.educationLevel = 'Choose the education from the list.'
      else if (draft.educationLevel === 'other' && !draft.education?.trim())
        e.education = 'Write the education.'
      if (!draft.occupationCategory) e.occupationCategory = 'Choose the job type from the list.'
      if (draft.occupationCategory !== 'not_working' && !draft.incomeBand)
        e.incomeBand = 'Choose the monthly income band from the list.'
    }
    {
      if (!draft.religion) e.religion = 'Choose the religion from the list.'
      if (!draft.category) e.category = 'Choose the category from the list.'
      else if (!draft.community?.trim())
        e.community = 'Write the jati.'
      if (!draft.state || !draft.district || !draft.city || draft.cityLat === undefined) {
        e.city = 'Choose the state, then the district, then the tehsil.'
      }
    }
    setErrors(e)
    // Keep form order, and show "Education" once even if both its keys failed.
    const keys = Object.keys(FIELD_NAMES).filter((k) => e[k])
    if (keys.length) {
      setMissing(keys)
      return false
    }
    return true
  }

  async function submit() {
    if (!validate()) return
    setBusy(true)
    try {
      await api.createProfile({
        createdFor: draft.createdFor,
        gender: draft.gender as Gender,
        dob: draft.dob!,
        heightCm: draft.heightCm!,
        weightBand: draft.weightBand!,
        complexion: draft.complexion as Complexion,
        // The level IS the education, except "Other", where the family writes it.
        education:
          draft.educationLevel === 'other'
            ? draft.education!.trim()
            : EDUCATION_SHORT[draft.educationLevel as EducationLevel],
        educationLevel: draft.educationLevel as EducationLevel,
        // No free-text work is collected any more — the job type IS the work.
        occupation: OCCUPATION_LABELS[draft.occupationCategory as OccupationCategory].en,
        occupationCategory: draft.occupationCategory as OccupationCategory,
        incomeBand:
          draft.occupationCategory === 'not_working'
            ? 'upto_15k'
            : (draft.incomeBand as IncomeBand),
        religion: draft.religion as Religion,
        category: draft.category as SocialCategory,
        community: draft.community!.trim(),
        state: draft.state!,
        district: draft.district!,
        city: draft.city!,
        village: draft.village?.trim() ?? '',
        cityLat: draft.cityLat!,
        cityLng: draft.cityLng!,
        maritalStatus: draft.maritalStatus as MaritalStatus,
        diet: draft.diet as Diet,
        manglik: draft.manglik as Manglik,
        about: '',
        familyBrief: '',
      })
      await refresh()
      setSubmitted(true)
    } catch (err) {
      push('error', err instanceof ApiError ? err.message : 'Could not save. Try once more.')
    } finally {
      setBusy(false)
    }
  }

  if (submitted) return <SubmittedScreen />

  return (
    <main className="mx-auto max-w-xl px-4 pb-32 pt-6 sm:pt-8">
      {/* --- Title block ------------------------------------------------------ */}
      <header>
        <h1 className="display text-[26px] leading-tight text-ink">Fill the biodata</h1>
      </header>

      <div className="mt-5 space-y-5">
        {/* --- 1. Personal ---------------------------------------------------- */}
        <SectionCard n={1} en="Fill in your correct details" done={done[0]}>
          <div>
            <p className="flex flex-wrap items-baseline gap-x-2 text-[15px] font-semibold leading-tight text-ink">
              Sex
            </p>
            <div
              role="group"
              aria-label="Sex"
              className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-paper p-1 ring-1 ring-inset ring-rule-strong"
            >
              {(
                [
                  {gender: 'male', createdFor: 'son', en: 'Male'},
                  {gender: 'female', createdFor: 'daughter', en: 'Female'},
                ] as const
              ).map((opt) => {
                const active = draft.gender === opt.gender
                return (
                  <button
                    key={opt.gender}
                    type="button"
                    onClick={() => {
                      set('gender', opt.gender)
                      // Matching side follows from sex; nobody is asked "for whom".
                      set('createdFor', opt.createdFor)
                      // A year allowed for a girl (18+) may be too young for a boy (21+).
                      if (draft.dob && api.ageFromDob(draft.dob) < minAgeFor(opt.gender))
                        set('dob', undefined)
                    }}
                    aria-pressed={active}
                    className={cx(
                      'tap flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[15px] font-semibold transition-all duration-150',
                      active
                        ? 'bg-card text-stamp shadow-[var(--shadow-e1)] ring-1 ring-inset ring-stamp-ring'
                        : 'text-ink-2 hover:text-ink',
                    )}
                  >
                    {active ? <Check size={16} strokeWidth={3} aria-hidden /> : null}
                    {opt.en}
                  </button>
                )
              })}
            </div>
          </div>

          <div data-field="dob">
            <DobField
              value={draft.dob ?? ''}
              onChange={(iso) => set('dob', iso || undefined)}
              error={errors.dob}
              minAge={minAgeFor(draft.gender)}
              hint={
                draft.dob
                  ? `Age ${api.ageFromDob(draft.dob)} years`
                  : `As on the certificate — must be ${minAgeFor(draft.gender)} or older`
              }
            />
          </div>

          <div data-field="heightCm">
            <Select
              label="Height"
              value={draft.heightCm ?? ''}
              onChange={(e) => set('heightCm', Number(e.target.value))}
              error={errors.heightCm}
            >
              <option value="">Choose height</option>
              {/* Feet and inches only — that is how every family says a height. */}
              {HEIGHT_OPTIONS.map(({cm, label}) => (
                <option key={cm} value={cm}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div data-field="weightBand">
            <Select
              label="Weight"
              value={draft.weightBand ?? ''}
              onChange={(e) => set('weightBand', e.target.value)}
              error={errors.weightBand}
            >
              <option value="">Choose weight</option>
              {WEIGHT_BANDS.map((band) => (
                <option key={band} value={band}>
                  {formatWeightBand(band)}
                </option>
              ))}
            </Select>
          </div>

          <div data-field="complexion">
            <SkinTonePicker
              value={draft.complexion as Complexion | undefined}
              onChange={(tone) => set('complexion', tone)}
              error={errors.complexion}
            />
          </div>

          <Select
            label="Marital status"
            value={draft.maritalStatus ?? 'never_married'}
            onChange={(e) => set('maritalStatus', e.target.value as MaritalStatus)}
          >
            {Object.entries(MARITAL_LABELS).map(([key, l]) => (
              <option key={key} value={key}>
                {l.en}
              </option>
            ))}
          </Select>
        </SectionCard>

        {/* --- 2. Education & work ------------------------------------------- */}
        <SectionCard n={2} en="Education & work" done={done[1]}>
          <div data-field="educationLevel">
            <Select
              label="Education"
              value={draft.educationLevel ?? ''}
              onChange={(e) => {
                set('educationLevel', e.target.value as EducationLevel)
                if (e.target.value !== 'other') set('education', undefined)
              }}
              error={errors.educationLevel}
            >
              <option value="">Choose education</option>
              {Object.entries(EDUCATION_LEVEL_LABELS).map(([key, l]) => (
                <option key={key} value={key}>
                  {l.en}
                </option>
              ))}
            </Select>
          </div>
          {draft.educationLevel === 'other' ? (
            <div data-field="education">
              <TextField
                label="Write the education"
                value={draft.education ?? ''}
                onChange={(e) => set('education', e.target.value)}
                maxLength={60}
                placeholder="e.g. ITI Electrician, D.Pharma, B.Voc"
                error={errors.education}
              />
            </div>
          ) : null}
          <div data-field="occupationCategory">
            <Select
              label="Job type"
              value={draft.occupationCategory ?? ''}
              onChange={(e) => {
                const next = e.target.value as OccupationCategory
                set('occupationCategory', next)
                if (next === 'not_working') set('incomeBand', undefined)
              }}
              error={errors.occupationCategory}
            >
              <option value="">Choose job type</option>
              {Object.entries(OCCUPATION_LABELS).map(([key, l]) => (
                <option key={key} value={key}>
                  {l.en}
                </option>
              ))}
            </Select>
          </div>
          {draft.occupationCategory !== 'not_working' ? (
            <div data-field="incomeBand">
              <Select
                label="Monthly income"
                value={draft.incomeBand ?? ''}
                onChange={(e) => set('incomeBand', e.target.value as IncomeBand)}
                error={errors.incomeBand}
                hint="Only the band is shown, never the exact amount."
              >
                <option value="">Choose income</option>
                {Object.entries(INCOME_LABELS).map(([key, l]) => (
                  <option key={key} value={key}>
                    {l.en}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </SectionCard>

        {/* --- 3. Community & city ------------------------------------------- */}
        <SectionCard n={3} en="Community & city" done={done[2]}>
          <div data-field="religion">
            <Select
              label="Religion"
              value={draft.religion ?? ''}
              onChange={(e) => {
                set('religion', (e.target.value || undefined) as Religion | undefined)
              }}
              error={errors.religion}
            >
              <option value="">Choose religion</option>
              {Object.entries(RELIGION_LABELS).map(([key, l]) => (
                <option key={key} value={key}>
                  {l.en}
                </option>
              ))}
            </Select>
          </div>
          <div data-field="category">
            <Select
              label="Category"
              value={draft.category ?? ''}
              onChange={(e) =>
                set('category', (e.target.value || undefined) as SocialCategory | undefined)
              }
              error={errors.category}
            >
              <option value="">Choose category</option>
              {Object.entries(CATEGORY_LABELS).map(([key, l]) => (
                <option key={key} value={key}>
                  {l.en}
                </option>
              ))}
            </Select>
          </div>
          <div data-field="community">
            <TextField
              label="Jati"
              value={draft.community ?? ''}
              onChange={(e) => set('community', e.target.value || undefined)}
              maxLength={40}
              autoComplete="off"
              placeholder="e.g. Rajput, Brahmin, Jat"
              error={errors.community}
            />
          </div>
          <div data-field="city">
            <StateDistrictTehsilField
              value={
                draft.city && draft.state && draft.district && draft.cityLat !== undefined
                  ? {
                      state: draft.state,
                      district: draft.district,
                      tehsil: draft.city,
                      lat: draft.cityLat,
                      lng: draft.cityLng ?? 0,
                    }
                  : null
              }
              onChange={(place) => {
                set('state', place?.state)
                set('district', place?.district)
                set('city', place?.tehsil)
                set('cityLat', place?.lat)
                set('cityLng', place?.lng)
              }}
              error={errors.city}
            />
          </div>
          <Select
            label="Manglik"
            value={draft.manglik ?? 'unknown'}
            onChange={(e) => set('manglik', e.target.value as Manglik)}
          >
            {Object.entries(MANGLIK_LABELS).map(([key, l]) => (
              <option key={key} value={key}>
                {l.en}
              </option>
            ))}
          </Select>
        </SectionCard>
      </div>

      {/* --- "You missed this" popup ---------------------------------------- */}
      <Sheet
        open={missing !== null}
        onClose={() => setMissing(null)}
        title="Some details are missing"
        footer={
          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              const first = missing?.[0]
              setMissing(null)
              if (first) requestAnimationFrame(() => goToField(first))
            }}
          >
            Fill the missing details
          </Button>
        }
      >
        <p className="text-[15px] text-ink-2">
          You have not filled these yet. Tap one to go to it. The biodata is listed only when every
          line below is filled.
        </p>
        <ul className="mt-3 space-y-2">
          {[...new Set((missing ?? []).map((k) => FIELD_NAMES[k]))].map((name) => {
            const key = (missing ?? []).find((k) => FIELD_NAMES[k] === name)!
            return (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => {
                    setMissing(null)
                    requestAnimationFrame(() => goToField(key))
                  }}
                  className="tap flex w-full items-center gap-3 rounded-xl bg-oxide-wash px-4 py-3 text-left ring-1 ring-inset ring-oxide/25"
                >
                  <CircleAlert size={20} className="shrink-0 text-oxide" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold text-ink">{name}</span>
                    <span className="block text-sm text-ink-2">{errors[key]}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </Sheet>

      {/* --- Sticky action bar ------------------------------------------------ */}
      <div
        className="glass fixed inset-x-0 bottom-0 z-40 border-t border-rule px-4 pt-3"
        style={{paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'}}
      >
        <div className="mx-auto max-w-xl">
          <Button
            variant="primary"
            fullWidth
            loading={busy}
            onClick={submit}
            className="py-3"
            icon={<Check size={20} aria-hidden />}
          >
            List the biodata
          </Button>
        </div>
      </div>
    </main>
  )
}

/**
 * One numbered card. The header strip is the "you are here" landmark; the tick
 * appears the moment every field inside is filled, so a parent can see what is
 * left without scrolling back up.
 */
function SectionCard({
  n,
  en,
  done,
  children,
}: {
  n: number
  en: string
  done: boolean
  children: React.ReactNode
}) {
  return (
    <Card as="section" className="overflow-hidden">
      <header className="flex items-center gap-3 border-b border-rule bg-paper px-4 py-3.5 sm:px-5">
        <span
          aria-hidden
          className={cx(
            'grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[15px] font-bold transition-colors',
            done ? 'bg-seal text-white' : 'brand-gradient text-white shadow-[var(--shadow-brand)]',
          )}
        >
          {done ? <Check size={17} strokeWidth={3} /> : n}
        </span>
        <h2 id={`section-${n}`} className="min-w-0 flex-1 leading-tight">
          <span className="block text-[17px] font-bold text-ink">{en}</span>
        </h2>
      </header>
      <fieldset className="space-y-6 p-4 sm:p-5">
        <legend className="sr-only">{en}</legend>
        {children}
      </fieldset>
    </Card>
  )
}

function SubmittedScreen() {
  const router = useRouter()
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <Card className="p-8 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-seal-wash text-seal">
          <Check size={40} strokeWidth={3} aria-hidden />
        </div>
        <h1 className="mt-5 text-2xl font-bold leading-tight">Your biodata is added</h1>
        <Button variant="primary" fullWidth className="mt-6" onClick={() => router.push('/browse')}>
          Start looking at profiles
        </Button>
      </Card>
    </main>
  )
}

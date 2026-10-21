'use client'

/**
 * Date of birth: ONE field, our own calendar.
 *
 * The browser's native date picker opens on today and expects a parent to
 * scroll back thirty years. This one looks like a normal input; tapping it
 * opens a sheet whose calendar already sits on the newest allowed date —
 * exactly 21 years back for a boy, 18 for a girl — with month and year as
 * dropdowns so any year is two taps away. Days outside the allowed range are
 * greyed out and cannot be tapped.
 *
 * Value is an ISO date (YYYY-MM-DD) or '' when empty.
 */

import {useId, useState} from 'react'
import {CalendarDays, ChevronLeft, ChevronRight} from 'lucide-react'
import {cx} from '@/lib/cx'
import {Button, Sheet} from './ui'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Today minus `years`, as ISO — the newest (or oldest) allowed birthday. */
function yearsAgo(years: number): string {
  const t = new Date()
  return iso(t.getFullYear() - years, t.getMonth() + 1, t.getDate())
}

function daysIn(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

/** "2002-03-12" -> "12 March 2002" */
function pretty(value: string): string {
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return ''
  return `${d} ${MONTHS[m - 1]} ${y}`
}

export function DobField({
  value,
  onChange,
  minAge,
  maxAge = 70,
  label = 'Date of birth',
  hint,
  error,
  className,
}: {
  value: string
  onChange: (iso: string) => void
  /** Youngest allowed age. The calendar opens on this date. */
  minAge: number
  maxAge?: number
  label?: string
  hint?: string
  error?: string | null
  className?: string
}) {
  const id = useId()
  const [open, setOpen] = useState(false)

  const max = yearsAgo(minAge) // newest allowed birthday
  const min = yearsAgo(maxAge) // oldest allowed birthday

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="flex flex-wrap items-baseline gap-x-2 text-base font-semibold leading-tight text-ink"
      >
        {label}
      </label>

      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-invalid={error ? 'true' : undefined}
        aria-describedby={hint || error ? `${id}-help` : undefined}
        className={cx(
          'tap mt-1.5 flex w-full items-center gap-3 rounded-xl bg-paper px-4 py-3.5 text-left text-[17px] ring-1 ring-inset transition-all duration-150 focus:bg-card focus:outline-none',
          error
            ? 'ring-oxide bg-oxide-wash/60 focus:ring-2 focus:ring-oxide'
            : 'ring-rule-strong focus:ring-2 focus:ring-stamp',
        )}
      >
        <CalendarDays size={20} className="shrink-0 text-ink-3" aria-hidden />
        {value ? (
          <span className="text-ink">{pretty(value)}</span>
        ) : (
          <span className="text-ink-3/70">Choose date</span>
        )}
      </button>

      {(hint || error) && (
        <p
          id={`${id}-help`}
          role={error ? 'alert' : undefined}
          className={cx('mt-1.5 text-sm', error ? 'font-medium text-oxide' : 'text-ink-3')}
        >
          {error ?? hint}
        </p>
      )}

      {open ? (
        <Calendar
          value={value}
          min={min}
          max={max}
          onPick={(v) => {
            onChange(v)
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  )
}

function Calendar({
  value,
  min,
  max,
  onPick,
  onClose,
}: {
  value: string
  min: string
  max: string
  onPick: (iso: string) => void
  onClose: () => void
}) {
  // Open on the chosen date if there is one, else on the newest allowed date.
  const start = (value && value >= min && value <= max ? value : max).split('-').map(Number)
  const [viewY, setViewY] = useState(start[0])
  const [viewM, setViewM] = useState(start[1])

  const [maxY] = max.split('-').map(Number)
  const [minY] = min.split('-').map(Number)
  const years = Array.from({length: maxY - minY + 1}, (_, i) => maxY - i)

  const firstWeekday = new Date(viewY, viewM - 1, 1).getDay()
  const count = daysIn(viewY, viewM)
  const cells: Array<number | null> = [
    ...Array.from({length: firstWeekday}, () => null),
    ...Array.from({length: count}, (_, i) => i + 1),
  ]

  const monthKey = `${viewY}-${String(viewM).padStart(2, '0')}`
  const canPrev = monthKey > min.slice(0, 7)
  const canNext = monthKey < max.slice(0, 7)

  function step(delta: number) {
    let m = viewM + delta
    let y = viewY
    if (m < 1) {
      m = 12
      y -= 1
    }
    if (m > 12) {
      m = 1
      y += 1
    }
    setViewM(m)
    setViewY(y)
  }

  const select =
    'tap h-11 appearance-none rounded-lg bg-paper px-3 pr-8 text-[15px] font-semibold text-ink ring-1 ring-inset ring-rule-strong focus:outline-none focus:ring-2 focus:ring-stamp'

  return (
    <Sheet
      open
      onClose={onClose}
      title="Date of birth"
      footer={
        <Button fullWidth onClick={onClose}>
          Close
        </Button>
      }
    >
      {/* Month / year — dropdowns, so a parent never has to tap "previous" 300 times. */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={!canPrev}
          aria-label="Previous month"
          className="tap grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-paper-deep disabled:opacity-30"
        >
          <ChevronLeft size={22} aria-hidden />
        </button>
        <span className="relative min-w-0 flex-1">
          <select
            aria-label="Month"
            value={viewM}
            onChange={(e) => setViewM(Number(e.target.value))}
            className={cx(select, 'w-full')}
          >
            {MONTHS.map((mo, i) => (
              <option key={mo} value={i + 1}>
                {mo}
              </option>
            ))}
          </select>
        </span>
        <span className="relative shrink-0">
          <select
            aria-label="Year"
            value={viewY}
            onChange={(e) => setViewY(Number(e.target.value))}
            className={cx(select, 'w-[6.5rem]')}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </span>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={!canNext}
          aria-label="Next month"
          className="tap grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-paper-deep disabled:opacity-30"
        >
          <ChevronRight size={22} aria-hidden />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center text-[12px] font-semibold uppercase tracking-wide text-ink-3">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1">
            {w}
          </span>
        ))}
      </div>

      <div
        role="grid"
        aria-label={`${MONTHS[viewM - 1]} ${viewY}`}
        className="mt-1 grid grid-cols-7 gap-1"
      >
        {cells.map((day, i) => {
          if (!day) return <span key={`pad-${i}`} aria-hidden />
          const v = iso(viewY, viewM, day)
          const allowed = v >= min && v <= max
          const chosen = v === value
          return (
            <button
              key={v}
              type="button"
              role="gridcell"
              disabled={!allowed}
              aria-selected={chosen}
              onClick={() => onPick(v)}
              className={cx(
                'grid aspect-square place-items-center rounded-full text-[16px] font-semibold transition-colors',
                chosen
                  ? 'brand-gradient text-white shadow-[var(--shadow-brand)]'
                  : allowed
                    ? 'text-ink hover:bg-stamp-wash hover:text-stamp'
                    : 'text-ink-3/40',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>

      <p className="mt-4 text-center text-sm text-ink-3">Tap the day to choose it.</p>
    </Sheet>
  )
}

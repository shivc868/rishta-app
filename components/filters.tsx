'use client';

/**
 * The filter form. One component, two containers: a sticky sidebar on desktop
 * and a bottom sheet on mobile. Keeping it single means the two can never drift
 * apart, which is how filter bugs usually start.
 */

import { useEffect, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ProfileFilters, Religion } from '@/types';
import {
  RELIGION_LABELS,
  EDUCATION_LEVEL_LABELS,
  INCOME_LABELS,
  MANGLIK_LABELS,
  MARITAL_LABELS,
  OCCUPATION_LABELS,
  formatHeightShort,
} from '@/lib/labels';
import { INDIA_STATES, getDistricts, getTehsils } from '@/lib/cities';
import { CheckRow, Select, cx } from './ui';

export interface FilterOptions {
  religions: Religion[];
  jatis: string[];
  ageRange: [number, number];
  heightRange: [number, number];
}

/**
 * Two-thumb range. Both inputs sit on top of each other; pointer events are
 * disabled on the track and re-enabled on the thumbs, so each thumb stays
 * grabbable even when they meet. Values are also printed as text, because a
 * slider alone is hard to read on a cheap screen in sunlight.
 */
function DualRange({
  label,
  hindi,
  min,
  max,
  step = 1,
  valueMin,
  valueMax,
  format,
  onChange,
}: {
  label: string;
  hindi: string;
  min: number;
  max: number;
  step?: number;
  valueMin: number;
  valueMax: number;
  format: (n: number) => string;
  onChange: (lo: number, hi: number) => void;
}) {
  const id = useId();
  const pct = (n: number) => ((n - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[15px] font-semibold">
          {label}
          <span className="hindi block font-normal text-ink-3">{hindi}</span>
        </span>
        <span className="code text-sm font-semibold text-ink">
          {format(valueMin)} – {format(valueMax)}
        </span>
      </div>

      <div className="relative mt-3 h-8">
        <div className="absolute inset-x-0 top-3 h-2 rounded-full bg-paper-deep" aria-hidden />
        <div
          className="absolute top-3 h-2 rounded-full bg-stamp"
          style={{ left: `${pct(valueMin)}%`, right: `${100 - pct(valueMax)}%` }}
          aria-hidden
        />
        <input
          type="range"
          id={`${id}-min`}
          aria-label={`${label} — from`}
          min={min}
          max={max}
          step={step}
          value={valueMin}
          onChange={(e) => onChange(Math.min(Number(e.target.value), valueMax), valueMax)}
          className="pointer-events-none absolute inset-x-0 top-0 h-8 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-stamp [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-stamp [&::-moz-range-thumb]:bg-white"
        />
        <input
          type="range"
          id={`${id}-max`}
          aria-label={`${label} — to`}
          min={min}
          max={max}
          step={step}
          value={valueMax}
          onChange={(e) => onChange(valueMin, Math.max(Number(e.target.value), valueMin))}
          className="pointer-events-none absolute inset-x-0 top-0 h-8 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-stamp [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-stamp [&::-moz-range-thumb]:bg-white"
        />
      </div>
    </div>
  );
}

function Section({
  title,
  hindi,
  children,
  defaultOpen = false,
  activeCount = 0,
}: {
  title: string;
  hindi: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  activeCount?: number;
}) {
  return (
    <details open={defaultOpen} className="border-b border-rule py-1 last:border-b-0">
      <summary className="tap flex cursor-pointer list-none items-center gap-2 py-2 [&::-webkit-details-marker]:hidden">
        <span className="flex-1 text-[15px] font-semibold">
          {title}
          <span className="hindi block font-normal text-ink-3">{hindi}</span>
        </span>
        {activeCount > 0 ? (
          <span className="code grid h-6 min-w-6 place-items-center rounded-full bg-stamp px-1.5 text-[12px] font-bold text-white">
            {activeCount}
          </span>
        ) : null}
        <ChevronDown size={20} className="shrink-0 text-ink-3" aria-hidden />
      </summary>
      <div className="pb-3">{children}</div>
    </details>
  );
}

function toggle<T extends string>(list: T[] | undefined, value: T, on: boolean): T[] | undefined {
  const set = new Set(list ?? []);
  if (on) set.add(value);
  else set.delete(value);
  return set.size ? [...set] : undefined;
}

/**
 * Location — the lead filter. Same official hierarchy as the wizard: pick a
 * state and only then the district filter appears, then tehsil. Distance
 * radius (from the searcher's own tehsil) sits underneath.
 */
function LocationFilter({
  value,
  patch,
}: {
  value: ProfileFilters;
  patch: (p: Partial<ProfileFilters>) => void;
}) {
  const [districts, setDistricts] = useState<string[]>([]);
  const [tehsils, setTehsils] = useState<string[]>([]);

  useEffect(() => {
    if (!value.state) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    getDistricts(value.state)
      .then((d) => {
        if (!cancelled) setDistricts(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [value.state]);

  useEffect(() => {
    if (!value.state || !value.district) {
      setTehsils([]);
      return;
    }
    let cancelled = false;
    getTehsils(value.state, value.district)
      .then((t) => {
        if (!cancelled) setTehsils(t);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [value.state, value.district]);

  return (
    <div className="space-y-3 py-3">
      <p className="text-[15px] font-bold">
        Location
        <span className="hindi ml-2 font-normal text-ink-3">स्थान</span>
      </p>

      <Select
        label="State"
        hindi="राज्य"
        value={value.state ?? ''}
        onChange={(e) =>
          patch({ state: e.target.value || undefined, district: undefined, city: undefined })
        }
      >
        <option value="">All states / सभी राज्य</option>
        {INDIA_STATES.map((st) => (
          <option key={st} value={st}>
            {st}
          </option>
        ))}
      </Select>

      {value.state ? (
        <Select
          label="District"
          hindi="ज़िला"
          value={value.district ?? ''}
          onChange={(e) => patch({ district: e.target.value || undefined, city: undefined })}
        >
          <option value="">All districts / सभी ज़िले</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      ) : null}

      {value.state && value.district ? (
        <Select
          label="Tehsil"
          hindi="तहसील"
          value={value.city ?? ''}
          onChange={(e) => patch({ city: e.target.value || undefined })}
        >
          <option value="">All tehsils / सभी तहसीलें</option>
          {tehsils.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      ) : null}

      <div>
        <label className="text-[15px] font-semibold">
          Within distance from you
          <span className="hindi block font-normal text-ink-3">आपसे इतनी दूरी तक</span>
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {[25, 50, 100, undefined].map((km) => (
            <button
              key={String(km)}
              type="button"
              onClick={() => patch({ maxDistanceKm: km })}
              aria-pressed={value.maxDistanceKm === km}
              className={cx(
                'tap rounded-lg border-2 px-3 py-2 text-[15px] font-semibold',
                value.maxDistanceKm === km
                  ? 'border-stamp bg-stamp-wash text-stamp-ink'
                  : 'border-rule-strong bg-card text-ink',
              )}
            >
              {km ? `${km} km` : 'Any distance'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FilterForm({
  value,
  options,
  onChange,
  className,
}: {
  value: ProfileFilters;
  options: FilterOptions;
  onChange: (next: ProfileFilters) => void;
  className?: string;
}) {
  const patch = (p: Partial<ProfileFilters>) => onChange({ ...value, ...p });

  const [ageFloor, ageCeil] = options.ageRange;
  const [hFloor, hCeil] = options.heightRange;

  return (
    <div className={cx('divide-y divide-rule', className)}>
      <LocationFilter value={value} patch={patch} />

      <div className="space-y-5 py-3">
        <DualRange
          label="Age"
          hindi="आयु"
          min={ageFloor}
          max={ageCeil}
          valueMin={value.ageMin ?? ageFloor}
          valueMax={value.ageMax ?? ageCeil}
          format={(n) => `${n} yrs`}
          onChange={(lo, hi) =>
            patch({
              ageMin: lo === ageFloor ? undefined : lo,
              ageMax: hi === ageCeil ? undefined : hi,
            })
          }
        />
        <DualRange
          label="Height"
          hindi="कद"
          min={hFloor}
          max={hCeil}
          valueMin={value.heightMinCm ?? hFloor}
          valueMax={value.heightMaxCm ?? hCeil}
          format={formatHeightShort}
          onChange={(lo, hi) =>
            patch({
              heightMinCm: lo === hFloor ? undefined : lo,
              heightMaxCm: hi === hCeil ? undefined : hi,
            })
          }
        />
      </div>

      <div className="py-3">
        <CheckRow
          checked={Boolean(value.verifiedOnly)}
          onChange={(on) => patch({ verifiedOnly: on || undefined })}
        >
          <span className="font-semibold">Only verified profiles</span>
          <span className="hindi block text-ink-3">केवल सत्यापित प्रोफ़ाइल</span>
        </CheckRow>
      </div>

      <Section
        title="Marital status"
        hindi="वैवाहिक स्थिति"
        activeCount={value.maritalStatus?.length ?? 0}
      >
        {Object.entries(MARITAL_LABELS).map(([key, l]) => (
          <CheckRow
            key={key}
            checked={value.maritalStatus?.includes(key as never) ?? false}
            onChange={(on) =>
              patch({ maritalStatus: toggle(value.maritalStatus, key as never, on) })
            }
          >
            {l.en}
            <span className="hindi block text-ink-3">{l.hi}</span>
          </CheckRow>
        ))}
      </Section>

      <Section title="Education" hindi="शिक्षा" activeCount={value.educationLevel?.length ?? 0}>
        {Object.entries(EDUCATION_LEVEL_LABELS).map(([key, l]) => (
          <CheckRow
            key={key}
            checked={value.educationLevel?.includes(key as never) ?? false}
            onChange={(on) =>
              patch({ educationLevel: toggle(value.educationLevel, key as never, on) })
            }
          >
            {l.en}
            <span className="hindi block text-ink-3">{l.hi}</span>
          </CheckRow>
        ))}
      </Section>

      <Section title="Job type" hindi="नौकरी का प्रकार" activeCount={value.occupationCategory?.length ?? 0}>
        {Object.entries(OCCUPATION_LABELS).map(([key, l]) => (
          <CheckRow
            key={key}
            checked={value.occupationCategory?.includes(key as never) ?? false}
            onChange={(on) =>
              patch({ occupationCategory: toggle(value.occupationCategory, key as never, on) })
            }
          >
            {l.en}
            <span className="hindi block text-ink-3">{l.hi}</span>
          </CheckRow>
        ))}
      </Section>

      <Section title="Monthly income" hindi="मासिक आय" activeCount={value.incomeBand?.length ?? 0}>
        {Object.entries(INCOME_LABELS).map(([key, l]) => (
          <CheckRow
            key={key}
            checked={value.incomeBand?.includes(key as never) ?? false}
            onChange={(on) => patch({ incomeBand: toggle(value.incomeBand, key as never, on) })}
          >
            {l.en}
            <span className="hindi block text-ink-3">{l.hi}</span>
          </CheckRow>
        ))}
      </Section>

      <Section
        title="Religion & jati"
        hindi="धर्म और जाति"
        activeCount={(value.religion?.length ?? 0) + (value.community?.length ?? 0)}
      >
        {options.religions.map((r) => (
          <CheckRow
            key={r}
            checked={value.religion?.includes(r) ?? false}
            onChange={(on) => patch({ religion: toggle(value.religion, r, on) })}
          >
            {RELIGION_LABELS[r].en}
            <span className="hindi block text-ink-3">{RELIGION_LABELS[r].hi}</span>
          </CheckRow>
        ))}
        <div className="mt-3 border-t border-dotted border-rule pt-2">
          <p className="mb-1 text-sm font-semibold text-ink-2">
            Jati
            <span className="hindi block font-normal text-ink-3">जाति</span>
          </p>
          {options.jatis.map((j) => (
            <CheckRow
              key={j}
              checked={value.community?.includes(j) ?? false}
              onChange={(on) => patch({ community: toggle(value.community, j, on) })}
            >
              {j}
            </CheckRow>
          ))}
        </div>
      </Section>

      <Section title="Manglik" hindi="मांगलिक" activeCount={value.manglik?.length ?? 0}>
        {Object.entries(MANGLIK_LABELS).map(([key, l]) => (
          <CheckRow
            key={key}
            checked={value.manglik?.includes(key as never) ?? false}
            onChange={(on) => patch({ manglik: toggle(value.manglik, key as never, on) })}
          >
            {l.en}
            <span className="hindi block text-ink-3">{l.hi}</span>
          </CheckRow>
        ))}
      </Section>
    </div>
  );
}

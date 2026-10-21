'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, SearchX } from 'lucide-react';
import * as api from '@/lib/api';
import { ApiError } from '@/lib/api';
import type { BrowseCard, ProfileFilters } from '@/types';
import {
  clearFilter,
  countActiveFilters,
  narrowestFilter,
  parseFilters,
  serializeFilters,
} from '@/lib/filter-params';
import {
  DIET_LABELS,
  EDUCATION_LEVEL_LABELS,
  INCOME_LABELS,
  MANGLIK_LABELS,
  MARITAL_LABELS,
  OCCUPATION_LABELS,
  RELIGION_LABELS,
  CATEGORY_LABELS,
  formatHeightShort,
  ACTIONS,
} from '@/lib/labels';
import { FilterForm, type FilterOptions } from '@/components/filters';
import { ProfileCardItem, ProfileCardSkeleton } from '@/components/profile-card';
import { CardSlider } from '@/components/card-slider';
import { Button, Chip, EmptyState, ErrorNote, Sheet } from '@/components/ui';
import { useToast } from '@/components/providers';

export default function BrowsePage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <BrowseInner />
    </Suspense>
  );
}

function BrowseInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push } = useToast();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const [cards, setCards] = useState<BrowseCard[] | null>(null);
  const [total, setTotal] = useState(0);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const activeCount = countActiveFilters(filters);

  const applyFilters = useCallback(
    (next: ProfileFilters) => {
      const qs = serializeFilters(next).toString();
      router.replace(qs ? `/browse?${qs}` : '/browse', { scroll: false });
    },
    [router],
  );

  const load = useCallback(async () => {
    setError(null);
    setCards(null);
    try {
      const [result, opts] = await Promise.all([api.getProfiles(filters), api.getFilterOptions()]);
      setCards(result.items);
      setTotal(result.total);
      setOptions(opts);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not open the register. Check your connection and try again.',
      );
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Optimistic save — flips immediately, rolls back and explains on failure. */
  async function onToggleSave(profileId: string) {
    const before = cards;
    setSavingId(profileId);
    setCards(
      (prev) =>
        prev?.map((c) =>
          c.profile.id === profileId ? { ...c, isShortlisted: !c.isShortlisted } : c,
        ) ?? prev,
    );
    try {
      const saved = await api.toggleShortlist(profileId);
      push('success', saved ? 'Saved to your list.' : 'Removed from your saved list.');
    } catch (err) {
      setCards(before);
      push('error', err instanceof ApiError ? err.message : 'Could not save. Try once more.');
    } finally {
      setSavingId(null);
    }
  }

  const chips = buildChips(filters);

  return (
    <div className="md:flex md:gap-6">
      {/* Desktop: sticky sidebar. Mobile: nothing — the sheet handles it. */}
      <aside className="hidden md:block md:w-72 md:shrink-0">
        <div className="sticky top-20 max-h-[calc(100dvh-104px)] overflow-y-auto rounded-2xl bg-card p-4 ring-1 ring-rule shadow-[var(--shadow-e1)]">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[17px] font-bold leading-6">
              Filters
              <span className="hindi block font-normal text-ink-3">छाँटें</span>
            </h2>
            {activeCount > 0 ? (
              <button
                type="button"
                onClick={() => applyFilters({ sort: filters.sort })}
                className="tap -mr-2 rounded-md px-2 py-1 text-[15px] font-semibold text-stamp hover:bg-stamp-wash"
              >
                Clear all
              </button>
            ) : null}
          </div>
          {options ? (
            <FilterForm value={filters} options={options} onChange={applyFilters} />
          ) : (
            <p className="py-6 text-center text-sm text-ink-3">Loading filters…</p>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* One thin toolbar row, so the card below it fits a phone screen whole. */}
        <div className="mb-2 flex h-9 items-center justify-between gap-3">
          <h1 className="text-[17px] font-bold leading-6 tracking-tight text-ink" aria-live="polite">
            Profiles
            <span className="ml-1.5 font-medium text-ink-3">
              {cards === null ? '…' : `· ${total}${activeCount > 0 ? ' matching' : ''}`}
            </span>
          </h1>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="tap -mr-2 flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[15px] font-semibold text-ink-2 hover:bg-paper-deep hover:text-ink md:hidden"
          >
            <Filter size={16} aria-hidden />
            Filters
            {activeCount > 0 ? (
              <span className="code grid h-5 min-w-5 place-items-center rounded-full bg-stamp px-1.5 text-[12px] font-semibold text-white">
                {activeCount}
              </span>
            ) : null}
          </button>
        </div>

        {chips.length > 0 ? (
          <ul className="mb-3 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <li key={chip.id}>
                <Chip
                  onRemove={() => applyFilters(chip.remove(filters))}
                  removeLabel={`Remove filter ${chip.label}`}
                >
                  {chip.label}
                </Chip>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => applyFilters({ sort: filters.sort })}
                className="tap px-2 text-sm font-semibold text-stamp underline"
              >
                Clear all
              </button>
            </li>
          </ul>
        ) : null}

        {error ? (
          <div>
            <ErrorNote message={error} onRetry={load} />
          </div>
        ) : cards === null ? (
          <ListSkeleton />
        ) : cards.length === 0 ? (
          <div>
            <EmptyState
              icon={<SearchX size={26} aria-hidden />}
              title="No profiles match these filters"
              hindi="इन फ़िल्टर से कोई प्रोफ़ाइल नहीं मिली"
              body={
                activeCount > 0
                  ? 'Try removing one filter. The narrowest one is usually the reason.'
                  : 'No profiles are listed for your search right now. New biodata is added every week.'
              }
              action={
                (() => {
                  const narrow = narrowestFilter(filters);
                  return narrow ? (
                    <Button
                      variant="primary"
                      onClick={() => applyFilters(clearFilter(filters, narrow.key))}
                    >
                      Remove the {narrow.label} filter
                    </Button>
                  ) : null;
                })()
              }
            />
          </div>
        ) : (
          <div>
            <CardSlider count={cards.length}>
              {cards.map((card) => (
                <ProfileCardItem
                  key={card.profile.id}
                  card={card}
                  onToggleSave={onToggleSave}
                  saving={savingId === card.profile.id}
                  slide
                />
              ))}
            </CardSlider>
          </div>
        )}

      </div>

      <MobileFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        options={options}
        onApply={(next) => {
          applyFilters(next);
          setSheetOpen(false);
        }}
      />
    </div>
  );
}

/**
 * The sheet edits a draft copy, so nothing reloads under the parent's finger
 * while they are still choosing. The live count on the Apply button is what
 * tells them whether they are about to see anything.
 */
function MobileFilterSheet({
  open,
  onClose,
  filters,
  options,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  filters: ProfileFilters;
  options: FilterOptions | null;
  onApply: (next: ProfileFilters) => void;
}) {
  const [draft, setDraft] = useState<ProfileFilters>(filters);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCount(null);
    const timer = setTimeout(async () => {
      try {
        const n = await api.countProfiles(draft);
        if (!cancelled) setCount(n);
      } catch {
        if (!cancelled) setCount(null);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draft, open]);

  const activeCount = countActiveFilters(draft);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={activeCount > 0 ? `Filters (${activeCount})` : 'Filters'}
      footer={
        <div className="flex gap-3">
          <Button
            className="shrink-0"
            onClick={() => setDraft({ sort: draft.sort })}
            disabled={activeCount === 0}
          >
            Clear all
          </Button>
          <Button variant="primary" fullWidth onClick={() => onApply(draft)}>
            {count === null
              ? ACTIONS.applyFilters.en
              : `Show ${count} ${count === 1 ? 'profile' : 'profiles'}`}
          </Button>
        </div>
      }
    >
      {options ? (
        <FilterForm value={draft} options={options} onChange={setDraft} />
      ) : (
        <p className="py-8 text-center text-ink-3">Loading filters…</p>
      )}
    </Sheet>
  );
}

function ListSkeleton() {
  return (
    <ul aria-busy="true" aria-label="Loading profiles">
      {Array.from({ length: 1 }, (_, i) => (
        <ProfileCardSkeleton key={i} />
      ))}
    </ul>
  );
}

// --- chips ------------------------------------------------------------------

interface ChipSpec {
  id: string;
  label: string;
  remove: (f: ProfileFilters) => ProfileFilters;
}

function buildChips(f: ProfileFilters): ChipSpec[] {
  const chips: ChipSpec[] = [];

  if (f.ageMin !== undefined || f.ageMax !== undefined) {
    chips.push({
      id: 'age',
      label: `Age ${f.ageMin ?? 'any'}–${f.ageMax ?? 'any'}`,
      remove: (x) => clearFilter(x, 'ageMin'),
    });
  }
  if (f.heightMinCm !== undefined || f.heightMaxCm !== undefined) {
    chips.push({
      id: 'height',
      label: `Height ${f.heightMinCm ? formatHeightShort(f.heightMinCm) : 'any'}–${
        f.heightMaxCm ? formatHeightShort(f.heightMaxCm) : 'any'
      }`,
      remove: (x) => clearFilter(x, 'heightMinCm'),
    });
  }
  if (f.maxDistanceKm !== undefined) {
    chips.push({
      id: 'distance',
      label: `Within ${f.maxDistanceKm} km`,
      remove: (x) => clearFilter(x, 'maxDistanceKm'),
    });
  }
  if (f.verifiedOnly) {
    chips.push({
      id: 'verified',
      label: 'Verified only',
      remove: (x) => clearFilter(x, 'verifiedOnly'),
    });
  }

  // Single-valued location chips, cleared cascade-aware by clearFilter.
  for (const [key, label] of [
    ['state', f.state],
    ['district', f.district],
    ['city', f.city],
  ] as const) {
    if (label) {
      chips.push({ id: key, label, remove: (x) => clearFilter(x, key) });
    }
  }

  const lists: Array<[keyof ProfileFilters, (v: string) => string]> = [
    ['maritalStatus', (v) => MARITAL_LABELS[v as keyof typeof MARITAL_LABELS]?.en ?? v],
    ['educationLevel', (v) => EDUCATION_LEVEL_LABELS[v as keyof typeof EDUCATION_LEVEL_LABELS]?.en ?? v],
    ['occupationCategory', (v) => OCCUPATION_LABELS[v as keyof typeof OCCUPATION_LABELS]?.en ?? v],
    ['incomeBand', (v) => INCOME_LABELS[v as keyof typeof INCOME_LABELS]?.en ?? v],
    ['religion', (v) => RELIGION_LABELS[v as keyof typeof RELIGION_LABELS]?.en ?? v],
    ['category', (v) => CATEGORY_LABELS[v as keyof typeof CATEGORY_LABELS]?.en ?? v],
    ['manglik', (v) => MANGLIK_LABELS[v as keyof typeof MANGLIK_LABELS]?.en ?? v],
    ['diet', (v) => DIET_LABELS[v as keyof typeof DIET_LABELS]?.en ?? v],
  ];

  for (const [key, label] of lists) {
    const values = f[key] as string[] | undefined;
    if (!values?.length) continue;
    for (const v of values) {
      chips.push({
        id: `${key}:${v}`,
        label: label(v),
        remove: (x) => {
          const rest = (x[key] as string[]).filter((item) => item !== v);
          const next = { ...x };
          if (rest.length) (next[key] as string[]) = rest;
          else delete next[key];
          return next;
        },
      });
    }
  }

  return chips;
}

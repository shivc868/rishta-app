/**
 * Filters <-> URL search params.
 *
 * Filter state lives in the URL, not in React state, so a parent can send the
 * link to their brother, hit back after opening a profile, and reload without
 * losing forty seconds of tapping.
 */

import type { ProfileFilters, SortOrder } from '@/types';

const LIST_KEYS = [
  'maritalStatus',
  'educationLevel',
  'occupationCategory',
  'incomeBand',
  'religion',
  'community',
  'manglik',
] as const satisfies ReadonlyArray<keyof ProfileFilters>;

/** Single-valued location cascade. */
const STR_KEYS = ['state', 'district', 'city'] as const satisfies ReadonlyArray<
  keyof ProfileFilters
>;

const NUM_KEYS = [
  'ageMin',
  'ageMax',
  'heightMinCm',
  'heightMaxCm',
  'maxDistanceKm',
] as const satisfies ReadonlyArray<keyof ProfileFilters>;

export function parseFilters(params: URLSearchParams | ReadonlyURLSearchParamsLike): ProfileFilters {
  const get = (k: string) => params.get(k);
  const out: ProfileFilters = {};

  for (const key of NUM_KEYS) {
    const raw = get(key);
    if (raw === null || raw === '') continue;
    const n = Number(raw);
    if (Number.isFinite(n)) out[key] = n;
  }
  for (const key of LIST_KEYS) {
    const raw = get(key);
    if (!raw) continue;
    // Cast is safe: unknown values simply never match a row.
    (out[key] as string[]) = raw.split(',').filter(Boolean);
  }
  for (const key of STR_KEYS) {
    const raw = get(key);
    if (raw) (out[key] as string) = raw;
  }
  if (get('verifiedOnly') === '1') out.verifiedOnly = true;
  const sort = get('sort');
  if (sort === 'newest' || sort === 'recently_active') out.sort = sort as SortOrder;

  return out;
}

export function serializeFilters(filters: ProfileFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of NUM_KEYS) {
    const v = filters[key];
    if (typeof v === 'number') params.set(key, String(v));
  }
  for (const key of LIST_KEYS) {
    const v = filters[key] as string[] | undefined;
    if (v?.length) params.set(key, v.join(','));
  }
  for (const key of STR_KEYS) {
    const v = filters[key] as string | undefined;
    if (v) params.set(key, v);
  }
  if (filters.verifiedOnly) params.set('verifiedOnly', '1');
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);
  return params;
}

/** Sort is a view preference, not a filter — it never counts towards the badge. */
export function countActiveFilters(filters: ProfileFilters): number {
  let n = 0;
  for (const key of NUM_KEYS) if (typeof filters[key] === 'number') n++;
  for (const key of LIST_KEYS) if ((filters[key] as string[] | undefined)?.length) n++;
  for (const key of STR_KEYS) if (filters[key]) n++;
  if (filters.verifiedOnly) n++;
  return n;
}

/**
 * The filter that is cutting out the most profiles — used by the empty state's
 * "relax this" button. Ranked by how often each one is the real culprit rather
 * than measured, because measuring needs a query per filter.
 */
export function narrowestFilter(
  filters: ProfileFilters,
): { key: keyof ProfileFilters; label: string } | null {
  const order: Array<{ key: keyof ProfileFilters; label: string }> = [

    { key: 'incomeBand', label: 'income' },
    { key: 'maxDistanceKm', label: 'distance' },
    { key: 'occupationCategory', label: 'kind of work' },
    { key: 'educationLevel', label: 'education level' },
    { key: 'manglik', label: 'manglik' },
    { key: 'community', label: 'jati' },
    { key: 'religion', label: 'religion' },
    { key: 'city', label: 'tehsil' },
    { key: 'district', label: 'district' },
    { key: 'state', label: 'state' },
    { key: 'heightMinCm', label: 'height' },
    { key: 'verifiedOnly', label: 'verified only' },
    { key: 'ageMin', label: 'age' },
  ];
  for (const item of order) {
    const v = filters[item.key];
    if (Array.isArray(v) ? v.length > 0 : v !== undefined) return item;
  }
  return null;
}

/** Removing a range filter has to clear both ends, or the chip lies. */
export function clearFilter(filters: ProfileFilters, key: keyof ProfileFilters): ProfileFilters {
  const next = { ...filters };
  delete next[key];
  if (key === 'ageMin' || key === 'ageMax') {
    delete next.ageMin;
    delete next.ageMax;
  }
  if (key === 'heightMinCm' || key === 'heightMaxCm') {
    delete next.heightMinCm;
    delete next.heightMaxCm;
  }
  // The location cascade clears downward: no state means no district, and so on.
  if (key === 'state') {
    delete next.district;
    delete next.city;
  }
  if (key === 'district') {
    delete next.city;
  }
  return next;
}

interface ReadonlyURLSearchParamsLike {
  get(name: string): string | null;
}

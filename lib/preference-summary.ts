/**
 * Partner preferences, read out as short labels — for the Settings card and
 * the Matches header. One line per criterion; an absent criterion is not
 * listed, because "doesn't matter" needs no sentence.
 */

import type { PartnerPreferences } from '@/types';
import {
  CATEGORY_LABELS,
  DIET_LABELS,
  EDUCATION_LEVEL_LABELS,
  INCOME_LABELS,
  MANGLIK_LABELS,
  MARITAL_LABELS,
  OCCUPATION_LABELS,
  RELIGION_LABELS,
  formatHeightShort,
} from './labels';

export interface PreferenceLine {
  label: string;
  value: string;
}

function list<T extends string>(values: T[] | undefined, map: Record<T, { en: string }>): string | null {
  if (!values?.length) return null;
  return values.map((v) => map[v]?.en ?? v).join(', ');
}

export function summarizePreferences(p: PartnerPreferences): PreferenceLine[] {
  const out: PreferenceLine[] = [];
  const push = (label: string, value: string | null) => {
    if (value) out.push({ label, value });
  };

  if (p.ageMin !== undefined || p.ageMax !== undefined) {
    push('Age', `${p.ageMin ?? 'any'} – ${p.ageMax ?? 'any'} yrs`);
  }
  if (p.heightMinCm !== undefined || p.heightMaxCm !== undefined) {
    push(
      'Height',
      `${p.heightMinCm ? formatHeightShort(p.heightMinCm) : 'any'} – ${
        p.heightMaxCm ? formatHeightShort(p.heightMaxCm) : 'any'
      }`,
    );
  }
  const place = [p.city, p.district, p.state].filter(Boolean).join(', ');
  push('Place', place || null);
  if (p.maxDistanceKm !== undefined) push('Distance', `Within ${p.maxDistanceKm} km`);
  push('Marital status', list(p.maritalStatus, MARITAL_LABELS));
  push('Religion', list(p.religion, RELIGION_LABELS));
  push('Category', list(p.category, CATEGORY_LABELS));
  push('Education', list(p.educationLevel, EDUCATION_LEVEL_LABELS));
  push('Job type', list(p.occupationCategory, OCCUPATION_LABELS));
  push('Monthly income', list(p.incomeBand, INCOME_LABELS));
  push('Manglik', list(p.manglik, MANGLIK_LABELS));
  push('Food', list(p.diet, DIET_LABELS));
  if (p.verifiedOnly) push('Verified', 'Verified profiles only');
  return out;
}

/** Number of criteria that actually narrow the match list. */
export function countPreferences(p: PartnerPreferences): number {
  return summarizePreferences(p).length;
}

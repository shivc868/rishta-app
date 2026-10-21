import Link from 'next/link';
import { BadgeCheck, ChevronDown, ChevronRight, Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
import {
  Avatar,
  EmptyState,
  PageHeader,
  Pagination,
  SegmentedTabs,
  StatusBadge,
  Table,
  Td,
  Tr,
} from '@/components/admin/ui';
import { inputClass } from '@/components/admin/styles';
import { cx } from '@/lib/cx';
import { requireAdmin } from '@/lib/admin/session';
import { getStats, listPlaces, listProfiles, PAGE_SIZE, type ProfileListQuery, type ProfileSort } from '@/lib/admin/queries';
import { ageFromDob } from '@/lib/api';
import { INCOME_SHORT, MARITAL_LABELS, RELIGION_LABELS, timeAgo } from '@/lib/labels';
import type { Gender, MaritalStatus, ProfileStatus, Religion } from '@/types';

type Tab = ProfileStatus | 'all';
const TAB_KEYS: Tab[] = ['all', 'active', 'paused', 'matched', 'pending_review'];

const SORTS: Array<{ key: ProfileSort; label: string }> = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'recently_active', label: 'Recently active' },
  { key: 'age_asc', label: 'Age: young to old' },
  { key: 'age_desc', label: 'Age: old to young' },
];

const CREATED_WITHIN = [
  { value: '', label: 'Any time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

type SP = Record<string, string | string[] | undefined>;
const str = (sp: SP, k: string) => (typeof sp[k] === 'string' ? (sp[k] as string).trim() : '');
const num = (sp: SP, k: string) => {
  const n = Number(str(sp, k));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
};
const oneOf = <T extends string>(v: string, allowed: readonly T[]): T | '' => ((allowed as readonly string[]).includes(v) ? (v as T) : '');

export default async function ProfilesPage({ searchParams }: PageProps<'/admin/profiles'>) {
  await requireAdmin();
  const sp = (await searchParams) as SP;

  const status: Tab = oneOf(str(sp, 'status'), TAB_KEYS) || 'all';
  const filters: ProfileListQuery = {
    status,
    q: str(sp, 'q'),
    page: num(sp, 'page') ?? 1,
    gender: oneOf(str(sp, 'gender'), ['male', 'female'] as const satisfies readonly Gender[]),
    religion: oneOf(str(sp, 'religion'), Object.keys(RELIGION_LABELS) as Religion[]),
    marital: oneOf(str(sp, 'marital'), Object.keys(MARITAL_LABELS) as MaritalStatus[]),
    state: str(sp, 'state'),
    district: str(sp, 'district'),
    ageMin: num(sp, 'age_min'),
    ageMax: num(sp, 'age_max'),
    verified: oneOf(str(sp, 'verified'), ['yes', 'no'] as const),
    createdWithin: num(sp, 'created'),
    sort: oneOf(str(sp, 'sort'), SORTS.map((s) => s.key)) || 'newest',
  };
  const page = filters.page ?? 1;

  const [{ rows, total }, stats, places] = await Promise.all([listProfiles(filters), getStats(), listPlaces()]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const districts = filters.state ? places[filters.state] ?? [] : Object.values(places).flat().sort();

  // Every link on the page keeps the current filters and overrides a few keys.
  const current: Record<string, string> = {
    status,
    q: filters.q ?? '',
    gender: filters.gender ?? '',
    religion: filters.religion ?? '',
    marital: filters.marital ?? '',
    state: filters.state ?? '',
    district: filters.district ?? '',
    age_min: filters.ageMin ? String(filters.ageMin) : '',
    age_max: filters.ageMax ? String(filters.ageMax) : '',
    verified: filters.verified ?? '',
    created: filters.createdWithin ? String(filters.createdWithin) : '',
    sort: filters.sort ?? 'newest',
    page: String(page),
  };
  const href = (patch: Record<string, string | number>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...current, ...patch })) {
      const val = String(v);
      if (!val || (k === 'page' && val === '1') || (k === 'sort' && val === 'newest') || (k === 'status' && val === 'all')) continue;
      params.set(k, val);
    }
    const qs = params.toString();
    return qs ? `/admin/profiles?${qs}` : '/admin/profiles';
  };

  // Chips for whatever is narrowing the list beyond the status tab.
  const chips: Array<{ key: string; label: string; clear: Record<string, string> }> = [];
  if (filters.q) chips.push({ key: 'q', label: `“${filters.q}”`, clear: { q: '' } });
  if (filters.gender) chips.push({ key: 'gender', label: filters.gender === 'male' ? 'Grooms' : 'Brides', clear: { gender: '' } });
  if (filters.religion) chips.push({ key: 'religion', label: RELIGION_LABELS[filters.religion].en, clear: { religion: '' } });
  if (filters.marital) chips.push({ key: 'marital', label: MARITAL_LABELS[filters.marital].en, clear: { marital: '' } });
  if (filters.state) chips.push({ key: 'state', label: filters.state, clear: { state: '', district: '' } });
  if (filters.district) chips.push({ key: 'district', label: `${filters.district} district`, clear: { district: '' } });
  if (filters.ageMin || filters.ageMax) {
    chips.push({
      key: 'age',
      label: `Age ${filters.ageMin ?? '…'}–${filters.ageMax ?? '…'}`,
      clear: { age_min: '', age_max: '' },
    });
  }
  if (filters.verified) chips.push({ key: 'verified', label: filters.verified === 'yes' ? 'Verified only' : 'Unverified only', clear: { verified: '' } });
  if (filters.createdWithin) chips.push({ key: 'created', label: `Created in last ${filters.createdWithin} days`, clear: { created: '' } });
  const filtersOpen = chips.some((c) => c.key !== 'q');

  const counts = stats
    ? {
        all: stats.pending_review + stats.active + stats.paused + stats.matched,
        active: stats.active,
        paused: stats.paused,
        matched: stats.matched,
        pending_review: stats.pending_review,
      }
    : undefined;
  const tabs = [
    { key: 'all' as Tab, label: 'All', count: counts?.all },
    { key: 'active' as Tab, label: 'Active', count: counts?.active },
    { key: 'paused' as Tab, label: 'Paused', count: counts?.paused },
    { key: 'matched' as Tab, label: 'Matched', count: counts?.matched },
    { key: 'pending_review' as Tab, label: 'Hidden for review', count: counts?.pending_review },
  ];

  const selectClass = cx(inputClass, 'appearance-none bg-[length:16px] bg-[right_8px_center] bg-no-repeat pr-8');
  const chevronBg = {
    backgroundImage:
      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238a839c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>\")",
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Profiles"
        description="Every biodata in the register. Profiles go live as soon as a family submits them; open one to pause, verify or remove it."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs tabs={tabs} active={status} href={(k) => href({ status: k, page: 1 })} ariaLabel="Status filter" />
        <div className="flex items-center gap-2 text-[13px]">
          <label className="flex items-center gap-2 text-ink-2">
            Sort
            <select
              name="sort"
              defaultValue={filters.sort}
              form="filters"
              className={cx(selectClass, 'h-8 w-44 text-[13px]')}
              style={chevronBg}
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Filter form. One GET form; the search row is always visible, the rest folds. */}
      <form id="filters" method="get" className="rounded-xl bg-card ring-1 ring-rule shadow-[var(--shadow-e1)]">
        <input type="hidden" name="status" value={status} />
        <div className="flex flex-wrap items-center gap-2 p-3">
          <label className="relative block min-w-[240px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
            <input
              name="q"
              type="search"
              defaultValue={filters.q}
              placeholder="Search code, town, district, jati, work or education"
              className={cx(inputClass, 'pl-8')}
            />
          </label>
          <button
            type="submit"
            className="h-9 rounded-lg bg-inverse px-3.5 text-[13px] font-semibold text-white hover:brightness-110"
          >
            Apply
          </button>
          {chips.length > 0 && (
            <Link href={href({ q: '', gender: '', religion: '', marital: '', state: '', district: '', age_min: '', age_max: '', verified: '', created: '', page: 1 })} className="h-9 rounded-lg px-3 text-[13px] font-medium leading-9 text-ink-2 hover:bg-paper-deep hover:text-ink">
              Reset
            </Link>
          )}
        </div>

        <details open={filtersOpen} className="group border-t border-rule">
          <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2.5 text-[13px] font-semibold text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal size={14} aria-hidden />
            Advanced filters
            {chips.filter((c) => c.key !== 'q').length > 0 && (
              <span className="rounded-full bg-stamp px-1.5 text-[11px] font-bold text-white">{chips.filter((c) => c.key !== 'q').length}</span>
            )}
            <ChevronDown size={14} aria-hidden className="ml-auto transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-3 border-t border-rule bg-paper/50 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Looking for">
              <select name="gender" defaultValue={filters.gender} className={selectClass} style={chevronBg}>
                <option value="">Grooms and brides</option>
                <option value="male">Grooms only</option>
                <option value="female">Brides only</option>
              </select>
            </Field>
            <Field label="Religion">
              <select name="religion" defaultValue={filters.religion} className={selectClass} style={chevronBg}>
                <option value="">Any religion</option>
                {(Object.keys(RELIGION_LABELS) as Religion[]).map((r) => (
                  <option key={r} value={r}>
                    {RELIGION_LABELS[r].en}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Marital status">
              <select name="marital" defaultValue={filters.marital} className={selectClass} style={chevronBg}>
                <option value="">Any</option>
                {(Object.keys(MARITAL_LABELS) as MaritalStatus[]).map((m) => (
                  <option key={m} value={m}>
                    {MARITAL_LABELS[m].en}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Verified badge">
              <select name="verified" defaultValue={filters.verified} className={selectClass} style={chevronBg}>
                <option value="">Any</option>
                <option value="yes">Verified only</option>
                <option value="no">Not verified</option>
              </select>
            </Field>
            <Field label="State">
              <select name="state" defaultValue={filters.state} className={selectClass} style={chevronBg}>
                <option value="">All states</option>
                {Object.keys(places).map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="District">
              <select name="district" defaultValue={filters.district} className={selectClass} style={chevronBg}>
                <option value="">All districts</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Age (years)">
              <div className="flex items-center gap-2">
                <input name="age_min" type="number" min={18} max={80} inputMode="numeric" placeholder="Min" defaultValue={filters.ageMin ?? ''} className={inputClass} />
                <span className="text-ink-3">–</span>
                <input name="age_max" type="number" min={18} max={80} inputMode="numeric" placeholder="Max" defaultValue={filters.ageMax ?? ''} className={inputClass} />
              </div>
            </Field>
            <Field label="Created">
              <select name="created" defaultValue={filters.createdWithin ? String(filters.createdWithin) : ''} className={selectClass} style={chevronBg}>
                {CREATED_WITHIN.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </details>
      </form>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
          <span className="text-ink-3">
            {total.toLocaleString('en-IN')} result{total === 1 ? '' : 's'} for
          </span>
          {chips.map((c) => (
            <Link
              key={c.key}
              href={href({ ...c.clear, page: 1 })}
              className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 font-medium text-ink ring-1 ring-inset ring-rule-strong hover:bg-paper"
              aria-label={`Remove filter ${c.label}`}
            >
              {c.label}
              <X size={12} aria-hidden className="text-ink-3" />
            </Link>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title={chips.length ? 'No profiles match these filters' : 'No profiles in this view'} icon={SearchX}>
          {chips.length ? 'Loosen a filter or reset them all.' : 'Profiles move here as their status changes.'}
        </EmptyState>
      ) : (
        <Table
          head={[
            'Profile',
            'Community',
            'Place',
            'Work',
            { label: filters.sort === 'recently_active' ? 'Last active' : 'Created', className: 'whitespace-nowrap' },
            'Status',
            { label: '', className: 'w-10' },
          ]}
          footer={<Pagination page={page} pages={pages} total={total} pageSize={PAGE_SIZE} href={(p) => href({ page: p })} />}
        >
          {rows.map((p) => (
            <Tr key={p.id}>
              <Td>
                <Link href={`/admin/profiles/${p.id}`} className="group flex items-center gap-3">
                  <Avatar seed={p.public_code} size="md" />
                  <span className="min-w-0 leading-tight">
                    <span className="code flex items-center gap-1 font-bold text-ink group-hover:text-stamp">
                      {p.public_code}
                      {p.is_verified && <BadgeCheck size={14} className="text-seal" aria-label="Verified" />}
                    </span>
                    <span className="block text-[12px] text-ink-3">
                      {p.gender === 'male' ? 'Groom' : 'Bride'} · {ageFromDob(p.dob)} yrs · {MARITAL_LABELS[p.marital_status].en}
                    </span>
                  </span>
                </Link>
              </Td>
              <Td>
                <span className="block">{p.community}</span>
                <span className="block text-[12px] text-ink-3">{RELIGION_LABELS[p.religion].en}</span>
              </Td>
              <Td>
                <span className="block">{p.city}</span>
                <span className="block text-[12px] text-ink-3">
                  {p.district}, {p.state}
                </span>
              </Td>
              <Td className="max-w-[220px]">
                <span className="block truncate">{p.occupation}</span>
                <span className="block text-[12px] text-ink-3">
                  {p.education} · {INCOME_SHORT[p.income_band]}
                </span>
              </Td>
              <Td muted className="whitespace-nowrap">
                {timeAgo(filters.sort === 'recently_active' ? p.last_active_at : p.created_at)}
              </Td>
              <Td>
                <StatusBadge status={p.status} />
              </Td>
              <Td>
                <Link
                  href={`/admin/profiles/${p.id}`}
                  aria-label={`Open ${p.public_code}`}
                  className="grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-paper-deep hover:text-ink"
                >
                  <ChevronRight size={16} aria-hidden />
                </Link>
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[12px] font-semibold text-ink-2">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

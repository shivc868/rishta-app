'use client';

/**
 * Settings: edit the biodata, set partner preferences, sign out.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Pencil, RotateCcw, SlidersHorizontal } from 'lucide-react';
import * as api from '@/lib/api';
import { ApiError } from '@/lib/api';
import type {
  Complexion,
  EducationLevel,
  Gender,
  IncomeBand,
  Manglik,
  MaritalStatus,
  OccupationCategory,
  PartnerPreferences,
  Profile,
  Religion,
  SocialCategory,
} from '@/types';
import {
  EDUCATION_LEVEL_LABELS,
  EDUCATION_SHORT,
  INCOME_LABELS,
  MANGLIK_LABELS,
  MARITAL_LABELS,
  OCCUPATION_LABELS,
  RELIGION_LABELS,
  CATEGORY_LABELS,
  WEIGHT_BANDS,
  HEIGHT_OPTIONS,
  formatWeightBand,
} from '@/lib/labels';
import {
  Button,
  Card,
  ErrorNote,
  FieldRow,
  PageHeader,
  SectionLabel,
  Select,
  Skeleton,
  TextField,
} from '@/components/ui';
import { FilterForm, type FilterOptions } from '@/components/filters';
import { summarizePreferences } from '@/lib/preference-summary';
import { SkinTonePicker } from '@/components/skin-tone';
import { StateDistrictTehsilField, type PickedPlace } from '@/components/city-field';
import { DobField } from '@/components/dob-field';
import { useSession, useToast } from '@/components/providers';
import { signOut } from '@/lib/auth';

export default function SettingsPage() {
  const router = useRouter();
  const { activeProfile, refresh } = useSession();
  const [busy, setBusy] = useState<string | null>(null);

  if (!activeProfile) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Settings" />

      {/* The one biodata this account holds — as filled at registration */}
      <BiodataCard profile={activeProfile} onSaved={refresh} />

      {/* What the family wants on the other side — drives the Matches tab */}
      <PreferencesCard key={activeProfile.id} />

      {/* Account */}
      <Card className="p-4">
        <SectionTitle en="Account" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            icon={<LogOut size={20} aria-hidden />}
            loading={busy === 'signout'}
            onClick={async () => {
              setBusy('signout');
              await signOut();
              await refresh();
              router.replace('/login');
            }}
          >
            Sign out
          </Button>
        </div>
      </Card>

      {/* Dev-only */}
      <Card className="bg-paper p-4 ring-rule-strong!">
        <p className="text-sm font-bold uppercase tracking-wide text-ink-3">Demo controls</p>
        <p className="mt-1 text-[15px] text-ink-2">
          This build runs on mock data stored in this browser. Resetting puts back the 100 seeded
          profiles, the two connected pairs and the five open requests.
        </p>
        <Button
          className="mt-3"
          variant="danger"
          loading={busy === 'reset'}
          icon={<RotateCcw size={20} aria-hidden />}
          onClick={async () => {
            setBusy('reset');
            await api.resetDemoData();
            await refresh();
            router.replace('/login');
          }}
        >
          Reset demo data
        </Button>
      </Card>
    </div>
  );
}

/**
 * The registration biodata, shown exactly as filled. Identity facts (gender,
 * birth date, height, religion, jati, marital status, manglik, location) are
 * read-only; the facts that genuinely change over time — weight, education,
 * work, income, food and village — can be edited in place.
 */
function BiodataCard({ profile, onSaved }: { profile: Profile; onSaved: () => Promise<void> }) {
  const { push } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => pickEditable(profile));
  const [place, setPlace] = useState<PickedPlace | null>(null);

  function startEdit() {
    setDraft(pickEditable(profile));
    setPlace({
      state: profile.state,
      district: profile.district,
      tehsil: profile.city,
      lat: profile.cityLat,
      lng: profile.cityLng,
    });
    setError(null);
    setEditing(true);
  }

  async function save() {
    if (!draft.community.trim()) {
      setError('Write the jati.');
      return;
    }
    if (draft.educationLevel === 'other' && !draft.education.trim()) {
      setError('Write the education.');
      return;
    }
    if (!place) {
      setError('Choose the state, then the district, then the tehsil.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.updateMyProfile({
        ...draft,
        community: draft.community.trim(),
        incomeBand: draft.occupationCategory === 'not_working' ? 'upto_15k' : draft.incomeBand,
        // The short text columns mirror the chosen levels, same as onboarding.
        education:
          draft.educationLevel === 'other' ? draft.education.trim() : EDUCATION_SHORT[draft.educationLevel],
        occupation: OCCUPATION_LABELS[draft.occupationCategory].en,
        state: place.state,
        district: place.district,
        city: place.tehsil,
        cityLat: place.lat,
        cityLng: place.lng,
      });
      await onSaved();
      setEditing(false);
      push('success', 'Your biodata is updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save. Try once more.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle en="My biodata" />
      </div>

      {error ? (
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      ) : null}

      {!editing ? (
        <div className="mt-3 flex items-center gap-3">
          <div className="min-w-0 flex-1 text-[15px] leading-6 text-ink-2">
            <span className="code font-bold text-ink">{profile.publicCode}</span> ·{' '}
            {api.ageFromDob(profile.dob)} yrs · {profile.city}
            <Link href="/me" className="ml-2 font-semibold text-stamp underline">
              View
            </Link>
          </div>
          <Button variant="primary" icon={<Pencil size={17} aria-hidden />} onClick={startEdit}>
            Edit your profile
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          <Select
            label="Boy or girl"
            value={draft.gender}
            onChange={(e) => setDraft({ ...draft, gender: e.target.value as Gender })}
            hint="You are only shown profiles of the opposite side."
          >
            <option value="female">Girl</option>
            <option value="male">Boy</option>
          </Select>
          <DobField
            value={draft.dob}
            minAge={draft.gender === 'male' ? 21 : 18}
            onChange={(iso) => setDraft({ ...draft, dob: iso })}
            hint={
              draft.dob
                ? `Age ${api.ageFromDob(draft.dob)} years — must be ${draft.gender === 'male' ? 21 : 18} or older`
                : `Must be ${draft.gender === 'male' ? 21 : 18} or older`
            }
          />
          <Select
            label="Height"
            value={draft.heightCm}
            onChange={(e) => setDraft({ ...draft, heightCm: Number(e.target.value) })}
          >
            {HEIGHT_OPTIONS.map(({ cm, label }) => (
              <option key={cm} value={cm}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            label="Weight"
            value={draft.weightBand}
            onChange={(e) => setDraft({ ...draft, weightBand: e.target.value })}
          >
            {WEIGHT_BANDS.map((b) => (
              <option key={b} value={b}>
                {formatWeightBand(b)}
              </option>
            ))}
          </Select>
          <SkinTonePicker
            value={draft.complexion}
            onChange={(tone) => setDraft({ ...draft, complexion: tone })}
          />
          <Select
            label="Marital status"
            value={draft.maritalStatus}
            onChange={(e) => setDraft({ ...draft, maritalStatus: e.target.value as MaritalStatus })}
          >
            {Object.entries(MARITAL_LABELS).map(([key, l]) => (
              <option key={key} value={key}>
                {l.en}
              </option>
            ))}
          </Select>
          <Select
            label="Education"
            value={draft.educationLevel}
            onChange={(e) => setDraft({ ...draft, educationLevel: e.target.value as EducationLevel })}
          >
            {Object.entries(EDUCATION_LEVEL_LABELS).map(([key, l]) => (
              <option key={key} value={key}>
                {l.en}
              </option>
            ))}
          </Select>
          {draft.educationLevel === 'other' ? (
            <TextField
              label="Write the education"
              value={draft.education}
              onChange={(e) => setDraft({ ...draft, education: e.target.value })}
              maxLength={60}
              placeholder="e.g. ITI Electrician, D.Pharma, B.Voc"
            />
          ) : null}
          <Select
            label="Job type"
            value={draft.occupationCategory}
            onChange={(e) =>
              setDraft({ ...draft, occupationCategory: e.target.value as OccupationCategory })
            }
          >
            {Object.entries(OCCUPATION_LABELS).map(([key, l]) => (
              <option key={key} value={key}>
                {l.en}
              </option>
            ))}
          </Select>
          {draft.occupationCategory !== 'not_working' ? (
            <Select
              label="Monthly income"
              value={draft.incomeBand}
              onChange={(e) => setDraft({ ...draft, incomeBand: e.target.value as IncomeBand })}
            >
              {Object.entries(INCOME_LABELS).map(([key, l]) => (
                <option key={key} value={key}>
                  {l.en}
                </option>
              ))}
            </Select>
          ) : null}
          <Select
            label="Religion"
            value={draft.religion}
            onChange={(e) => {
              setDraft({ ...draft, religion: e.target.value as Religion });
            }}
          >
            {Object.entries(RELIGION_LABELS).map(([key, l]) => (
              <option key={key} value={key}>
                {l.en}
              </option>
            ))}
          </Select>
          <Select
            label="Category"
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value as SocialCategory })}
          >
            {Object.entries(CATEGORY_LABELS).map(([key, l]) => (
              <option key={key} value={key}>
                {l.en}
              </option>
            ))}
          </Select>
          <TextField
            label="Jati"
            value={draft.community}
            maxLength={40}
            autoComplete="off"
            placeholder="e.g. Rajput, Brahmin, Jat"
            onChange={(e) => setDraft({ ...draft, community: e.target.value })}
          />
          <Select
            label="Manglik"
            value={draft.manglik}
            onChange={(e) => setDraft({ ...draft, manglik: e.target.value as Manglik })}
          >
            {Object.entries(MANGLIK_LABELS).map(([key, l]) => (
              <option key={key} value={key}>
                {l.en}
              </option>
            ))}
          </Select>
          <StateDistrictTehsilField value={place} onChange={setPlace} />
          <TextField
            label="Village / mohalla"
            value={draft.village}
            maxLength={60}
            placeholder="Optional"
            onChange={(e) => setDraft({ ...draft, village: e.target.value })}
          />
          <div className="flex gap-2 pt-1">
            <Button variant="primary" loading={saving} onClick={save}>
              Save changes
            </Button>
            <Button variant="quiet" disabled={saving} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function pickEditable(p: Profile) {
  return {
    gender: p.gender,
    dob: p.dob,
    // Snap to the nearest inch option so a profile saved at e.g. 169 cm still shows a selection.
    heightCm: HEIGHT_OPTIONS.reduce((best, o) =>
      Math.abs(o.cm - p.heightCm) < Math.abs(best - p.heightCm) ? o.cm : best, HEIGHT_OPTIONS[0].cm),
    weightBand: p.weightBand,
    complexion: p.complexion as Complexion,
    maritalStatus: p.maritalStatus,
    educationLevel: p.educationLevel,
    // Only meaningful when the level is "other"; otherwise the level names the education.
    education: p.educationLevel === 'other' ? p.education : '',
    occupationCategory: p.occupationCategory,
    incomeBand: p.incomeBand,
    religion: p.religion,
    category: p.category,
    community: p.community,
    manglik: p.manglik,
    village: p.village,
  };
}

/**
 * Partner preferences. The same form as the search filters, because a
 * preference IS a saved filter: whatever is set here is what the Matches tab
 * requires of every profile it shows. Until the family saves once, the card
 * shows the defaults derived from their biodata.
 */
function PreferencesCard() {
  const { push } = useToast();
  const [state, setState] = useState<{ prefs: PartnerPreferences; isDefault: boolean } | null>(null);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [draft, setDraft] = useState<PartnerPreferences>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, o] = await Promise.all([api.getPartnerPreferences(), api.getFilterOptions()]);
      setState(p);
      setOptions(o);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your preferences.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Deep link from the Matches tab opens the editor straight away.
  useEffect(() => {
    if (state && typeof window !== 'undefined' && window.location.hash === '#preferences') {
      setDraft(state.prefs);
      setEditing(true);
    }
  }, [state]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const prefs = await api.updatePartnerPreferences(draft);
      setState({ prefs, isDefault: false });
      setEditing(false);
      push('success', 'Preferences saved. Your Matches tab now follows them.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save. Try once more.');
    } finally {
      setSaving(false);
    }
  }

  const lines = state ? summarizePreferences(state.prefs) : [];

  return (
    <Card className="scroll-mt-20 p-4">
      <span id="preferences" className="block scroll-mt-20" aria-hidden />
      <div className="flex items-center justify-between gap-3">
        <SectionTitle en="Partner preferences" />
        {state && !editing ? (
          <Button
            variant="quiet"
            icon={<SlidersHorizontal size={17} aria-hidden />}
            onClick={() => {
              setDraft(state.prefs);
              setError(null);
              setEditing(true);
            }}
          >
            Edit
          </Button>
        ) : null}
      </div>
      <p className="mt-2 text-[15px] text-ink-2">
        Profiles that fit every line here come first in Matches and in Search. Leave a line
        open and it will not count.
        {state?.isDefault ? (
          <span className="mt-1 block text-ink-3">
            These are suggested from your biodata. Edit and save to make them yours.
          </span>
        ) : null}
      </p>

      {error ? (
        <div className="mt-3">
          <ErrorNote message={error} onRetry={load} />
        </div>
      ) : null}

      {!state ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-3/5" />
        </div>
      ) : !editing ? (
        <div className="mt-2">
          {lines.length ? (
            lines.map((l) => (
              <FieldRow key={l.label} label={l.label}>
                {l.value}
              </FieldRow>
            ))
          ) : (
            <p className="py-2 text-[15px] text-ink-3">
              Nothing set — every profile on the other side counts as a match.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3">
          {options ? (
            <FilterForm value={draft} options={options} onChange={(next) => setDraft(next)} />
          ) : (
            <p className="py-6 text-center text-sm text-ink-3">Loading…</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" loading={saving} onClick={save}>
              Save preferences
            </Button>
            <Button
              variant="quiet"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="quiet"
              className="ml-auto"
              onClick={() => setDraft({})}
              disabled={Object.keys(draft).length === 0}
            >
              Clear all
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function SectionTitle({ en }: { en: string }) {
  return <SectionLabel en={en} />;
}


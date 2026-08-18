'use client';

/**
 * The biodata wizard. Modelled on the printed sheet families already fill in,
 * in the same order they are used to: basic details, then education and work,
 * then family and community, then the private page that only the office sees.
 *
 * Step 4 leads with what stays private, before asking for any of it.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, ClipboardCheck } from 'lucide-react';
import * as api from '@/lib/api';
import { ApiError, type ProfileDraft } from '@/lib/api';
import { Button, Card, Select, TextField, cx } from '@/components/ui';
import { StateDistrictTehsilField } from '@/components/city-field';
import { useSession, useToast } from '@/components/providers';
import {
  EDUCATION_LEVEL_LABELS,
  JATI_OPTIONS,
  RELIGION_LABELS,
  EDUCATION_SHORT,
  INCOME_LABELS,
  MANGLIK_LABELS,
  MARITAL_LABELS,
  OCCUPATION_LABELS,
  WEIGHT_BANDS,
  formatHeight,
  formatWeightBand,
} from '@/lib/labels';
import type {
  CreatedFor,
  Religion,
  Diet,
  EducationLevel,
  Gender,
  IncomeBand,
  Manglik,
  MaritalStatus,
  OccupationCategory,
} from '@/types';

const STEPS = [
  { en: 'Basic details', hi: 'बुनियादी जानकारी' },
  { en: 'Education & work', hi: 'शिक्षा और काम' },
  { en: 'Community & city', hi: 'समाज और शहर' },
];

type Draft = Partial<ProfileDraft> & { createdFor: CreatedFor; jatiChoice?: string };

const EMPTY: Draft = {
  createdFor: 'daughter',
  gender: 'female',
  diet: 'vegetarian',
  manglik: 'unknown',
  maritalStatus: 'never_married',
};

export default function OnboardingPage() {
  const router = useRouter();
  const { push } = useToast();
  const { ready, isSignedIn, refresh } = useSession();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !isSignedIn) router.replace('/login');
  }, [ready, isSignedIn, router]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  };

  function validate(current: number): boolean {
    const e: Record<string, string> = {};
    if (current === 0) {
      if (!draft.dob) e.dob = 'Choose the date of birth as written on the certificate.';
      else {
        const age = api.ageFromDob(draft.dob);
        if (age < 18) e.dob = 'The person must be 18 or older to be listed here.';
        if (age > 70) e.dob = 'Check the year — this date gives an age above 70.';
      }
      if (!draft.heightCm) e.heightCm = 'Choose a height from the list.';
      if (!draft.weightBand) e.weightBand = 'Choose the weight from the list.';
    }
    if (current === 1) {
      if (!draft.educationLevel) e.educationLevel = 'Choose the education from the list.';
      if (!draft.occupationCategory) e.occupationCategory = 'Choose the job type from the list.';
      if (!draft.incomeBand) e.incomeBand = 'Choose the monthly income band from the list.';
    }
    if (current === 2) {
      if (!draft.religion) e.religion = 'Choose the religion from the list.';
      else if (!draft.jatiChoice) e.community = 'Choose the jati from the list.';
      else if (draft.jatiChoice === 'other' && !draft.community?.trim()) {
        e.community = 'Write the jati name.';
      }
      if (!draft.state || !draft.district || !draft.city || draft.cityLat === undefined) {
        e.city = 'Choose the state, then the district, then the tehsil.';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validate(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0 });
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0 });
  }

  async function submit() {
    if (!validate(2)) return;
    setBusy(true);
    try {
      const profile = await api.createProfile({
        createdFor: draft.createdFor,
        gender: draft.gender as Gender,
        dob: draft.dob!,
        heightCm: draft.heightCm!,
        weightBand: draft.weightBand!,
        // No free-text degree is collected any more — the level IS the education.
        education: EDUCATION_SHORT[draft.educationLevel as EducationLevel],
        educationLevel: draft.educationLevel as EducationLevel,
        // No free-text work is collected any more — the job type IS the work.
        occupation: OCCUPATION_LABELS[draft.occupationCategory as OccupationCategory].en,
        occupationCategory: draft.occupationCategory as OccupationCategory,
        incomeBand: draft.incomeBand as IncomeBand,
        religion: draft.religion as Religion,
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
      });
      await refresh();
      setSubmittedCode(profile.publicCode);
    } catch (err) {
      push('error', err instanceof ApiError ? err.message : 'Could not save. Try once more.');
    } finally {
      setBusy(false);
    }
  }

  if (submittedCode) return <SubmittedScreen code={submittedCode} />;

  return (
    <main className="mx-auto max-w-xl px-4 py-5 pb-28">
      <h1 className="text-xl font-bold leading-tight">
        Fill the biodata
        <span className="hindi block font-normal text-ink-3">बायोडाटा भरें</span>
      </h1>

      <ProgressBar step={step} />

      <Card className="mt-4 p-4 sm:p-5">
        {step === 0 && (
          <fieldset className="space-y-4">
            <legend className="sr-only">Basic details</legend>

            <div>
              <p className="text-[15px] font-semibold">
                Who are you creating this for?
                <span className="hindi block font-normal text-ink-3">
                  यह प्रोफ़ाइल किसके लिए बना रहे हैं?
                </span>
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(
                  [
                    { key: 'daughter', en: 'My daughter', hi: 'बेटी', gender: 'female' },
                    { key: 'son', en: 'My son', hi: 'बेटा', gender: 'male' },
                    { key: 'self', en: 'Myself', hi: 'स्वयं', gender: null },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      set('createdFor', opt.key);
                      if (opt.gender) set('gender', opt.gender);
                    }}
                    aria-pressed={draft.createdFor === opt.key}
                    className={cx(
                      'tap flex flex-col items-center justify-center rounded-lg border-2 px-2 py-3 text-[15px] font-semibold',
                      draft.createdFor === opt.key
                        ? 'border-stamp bg-stamp-wash text-stamp-ink'
                        : 'border-rule-strong bg-card text-ink',
                    )}
                  >
                    {opt.en}
                    <span className="hindi font-normal text-ink-3">{opt.hi}</span>
                  </button>
                ))}
              </div>
            </div>

            <Select
              label="Boy or girl"
              hindi="लड़का या लड़की"
              value={draft.gender ?? 'female'}
              onChange={(e) => set('gender', e.target.value as Gender)}
              hint="You will only be shown profiles of the opposite side."
            >
              <option value="female">Girl / लड़की</option>
              <option value="male">Boy / लड़का</option>
            </Select>

            <TextField
              label="Date of birth"
              hindi="जन्म तिथि"
              type="date"
              value={draft.dob ?? ''}
              onChange={(e) => set('dob', e.target.value)}
              error={errors.dob}
              hint={draft.dob ? `Age ${api.ageFromDob(draft.dob)} years` : 'As on the certificate'}
            />

            <Select
              label="Height"
              hindi="कद"
              value={draft.heightCm ?? ''}
              onChange={(e) => set('heightCm', Number(e.target.value))}
              error={errors.heightCm}
            >
              <option value="">Choose height / कद चुनें</option>
              {Array.from({ length: 46 }, (_, i) => 142 + i).map((cm) => (
                <option key={cm} value={cm}>
                  {formatHeight(cm)}
                </option>
              ))}
            </Select>

            <Select
              label="Weight"
              hindi="वज़न"
              value={draft.weightBand ?? ''}
              onChange={(e) => set('weightBand', e.target.value)}
              error={errors.weightBand}
            >
              <option value="">Choose weight / वज़न चुनें</option>
              {WEIGHT_BANDS.map((band) => (
                <option key={band} value={band}>
                  {formatWeightBand(band)}
                </option>
              ))}
            </Select>
            <Select
              label="Marital status"
              hindi="वैवाहिक स्थिति"
              value={draft.maritalStatus ?? 'never_married'}
              onChange={(e) => set('maritalStatus', e.target.value as MaritalStatus)}
            >
              {Object.entries(MARITAL_LABELS).map(([key, l]) => (
                <option key={key} value={key}>
                  {l.en} / {l.hi}
                </option>
              ))}
            </Select>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="space-y-4">
            <legend className="sr-only">Education and work</legend>
            <Select
              label="Education"
              hindi="शिक्षा"
              value={draft.educationLevel ?? ''}
              onChange={(e) => set('educationLevel', e.target.value as EducationLevel)}
              error={errors.educationLevel}
            >
              <option value="">Choose education / शिक्षा चुनें</option>
              {Object.entries(EDUCATION_LEVEL_LABELS).map(([key, l]) => (
                <option key={key} value={key}>
                  {l.en} / {l.hi}
                </option>
              ))}
            </Select>
            <Select
              label="Job type"
              hindi="नौकरी का प्रकार"
              value={draft.occupationCategory ?? ''}
              onChange={(e) => set('occupationCategory', e.target.value as OccupationCategory)}
              error={errors.occupationCategory}
            >
              <option value="">Choose job type / प्रकार चुनें</option>
              {Object.entries(OCCUPATION_LABELS).map(([key, l]) => (
                <option key={key} value={key}>
                  {l.en} / {l.hi}
                </option>
              ))}
            </Select>
            <Select
              label="Monthly income"
              hindi="मासिक आय"
              value={draft.incomeBand ?? ''}
              onChange={(e) => set('incomeBand', e.target.value as IncomeBand)}
              error={errors.incomeBand}
              hint="Only the band is shown, never the exact amount."
            >
              {/* Hindi only — the English label is the same numbers again, and
                  the doubled text made every option read like a sentence. */}
              <option value="">आय चुनें</option>
              {Object.entries(INCOME_LABELS).map(([key, l]) => (
                <option key={key} value={key}>
                  {l.hi}
                </option>
              ))}
            </Select>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="space-y-4">
            <legend className="sr-only">Community and city</legend>
            <Select
              label="Religion"
              hindi="धर्म"
              value={draft.religion ?? ''}
              onChange={(e) => {
                set('religion', (e.target.value || undefined) as Religion | undefined);
                set('jatiChoice', undefined);
                set('community', undefined);
              }}
              error={errors.religion}
            >
              <option value="">Choose religion / धर्म चुनें</option>
              {Object.entries(RELIGION_LABELS).map(([key, l]) => (
                <option key={key} value={key}>
                  {l.en} / {l.hi}
                </option>
              ))}
            </Select>
            {draft.religion ? (
              <Select
                label="Jati"
                hindi="जाति"
                value={draft.jatiChoice ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  set('jatiChoice', v || undefined);
                  // A listed jati is final; "Other" waits for the text box.
                  set('community', v && v !== 'other' ? v : undefined);
                }}
                error={draft.jatiChoice !== 'other' ? errors.community : undefined}
              >
                <option value="">Choose jati / जाति चुनें</option>
                {JATI_OPTIONS[draft.religion as Religion].map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
                <option value="other">Other / अन्य</option>
              </Select>
            ) : null}
            {draft.jatiChoice === 'other' ? (
              <TextField
                label="Write the jati"
                hindi="जाति लिखें"
                value={draft.community ?? ''}
                onChange={(e) => set('community', e.target.value)}
                maxLength={40}
                error={errors.community}
              />
            ) : null}
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
                set('state', place?.state);
                set('district', place?.district);
                set('city', place?.tehsil);
                set('cityLat', place?.lat);
                set('cityLng', place?.lng);
              }}
              error={errors.city}
            />
            <TextField
              label="Village or mohalla (optional)"
              hindi="गाँव या मोहल्ला (वैकल्पिक)"
              value={draft.village ?? ''}
              onChange={(e) => set('village', e.target.value)}
              maxLength={60}
              placeholder="e.g. Dilari"
              hint="Write it if you live in a village or mohalla. You can leave this empty. / गाँव या मोहल्ले में रहते हों तो नाम लिखें, वरना खाली छोड़ दें।"
            />
            <Select
              label="Manglik"
              hindi="मांगलिक"
              value={draft.manglik ?? 'unknown'}
              onChange={(e) => set('manglik', e.target.value as Manglik)}
            >
              {Object.entries(MANGLIK_LABELS).map(([key, l]) => (
                <option key={key} value={key}>
                  {l.en} / {l.hi}
                </option>
              ))}
            </Select>
          </fieldset>
        )}

      </Card>

      <div className="fixed inset-x-0 bottom-0 border-t-2 border-rule-strong bg-card px-4 py-3">
        <div className="mx-auto flex max-w-xl gap-3">
          {step > 0 && (
            <Button onClick={back} icon={<ArrowLeft size={20} aria-hidden />} className="shrink-0">
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              variant="primary"
              fullWidth
              onClick={next}
              icon={<ArrowRight size={20} aria-hidden />}
              label={{ en: 'Save and continue', hi: 'सहेजें और आगे बढ़ें' }}
            />
          ) : (
            <Button
              variant="primary"
              fullWidth
              loading={busy}
              onClick={submit}
              icon={<Check size={20} aria-hidden />}
              label={{ en: 'Send for review', hi: 'जाँच के लिए भेजें' }}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function ProgressBar({ step }: { step: number }) {
  const pct = ((step + 1) / STEPS.length) * 100;
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">
          Step {step + 1} of {STEPS.length} — {STEPS[step].en}
          <span className="hindi block font-normal text-ink-3">{STEPS[step].hi}</span>
        </span>
        <span className="code text-ink-3">{Math.round(pct)}%</span>
      </div>
      <div
        className="mt-2 h-2.5 w-full border border-rule-strong bg-card"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-label="Biodata progress"
      >
        <div className="h-full bg-stamp transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SubmittedScreen({ code }: { code: string }) {
  const router = useRouter();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <Card className="p-6 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-seal-wash text-seal">
          <ClipboardCheck size={30} aria-hidden />
        </div>
        <h1 className="mt-4 text-xl font-bold leading-tight">
          Under review — usually within 24 hours
          <span className="hindi block font-normal text-ink-3">
            जाँच जारी है — आमतौर पर 24 घंटे में
          </span>
        </h1>
        <p className="mt-3 text-[15px] text-ink-2">
          Our office checks every biodata before it goes into the register. Your profile code is
        </p>
        <p className="code mt-2 text-2xl font-bold">{code}</p>
        <p className="mt-3 text-[15px] text-ink-2">
          You can start looking at profiles right away. Families will be able to find yours once the
          check is done.
        </p>
        <Button
          variant="primary"
          fullWidth
          className="mt-5"
          onClick={() => router.push('/browse')}
          label={{ en: 'Start looking at profiles', hi: 'प्रोफ़ाइल देखना शुरू करें' }}
        />
      </Card>
    </main>
  );
}

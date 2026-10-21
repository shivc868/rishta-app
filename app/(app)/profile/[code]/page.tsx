'use client';

/**
 * Profile detail. Everything on this page is driven by `ProfileView` from the
 * API — the component decides layout, never permission. If a field is not in
 * `revealed`, there is nothing here that could print it.
 *
 * One action lives here: Request number. The other family says yes or no;
 * on yes their number (and name) appear in the bar at the bottom.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bookmark, BookmarkCheck, Clock, Flag, MapPin, Phone, UserRound } from 'lucide-react';
import * as api from '@/lib/api';
import { ApiError } from '@/lib/api';
import type { ProfileView } from '@/types';
import {
  ACTIONS,
  CATEGORY_LABELS,
  COMPLEXION_LABELS,
  EDUCATION_LEVEL_LABELS,
  INCOME_LABELS,
  MANGLIK_LABELS,
  MARITAL_LABELS,
  OCCUPATION_LABELS,
  RELIGION_LABELS,
  daysUntil,
  formatHeightShort,
  formatWeightBand,
  timeAgo,
} from '@/lib/labels';
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  FieldRow,
  SectionLabel,
  Sheet,
  Skeleton,
  TextArea,
  cx,
} from '@/components/ui';
import { SkinToneDot } from '@/components/skin-tone';
import { GenderAvatar } from '@/components/avatar';
import { useSession, useToast } from '@/components/providers';

export default function ProfileDetailPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { push } = useToast();
  const { refresh } = useSession();

  const [view, setView] = useState<ProfileView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const code = params?.code ?? '';

  const load = useCallback(async () => {
    setError(null);
    try {
      setView(await api.getProfile(code));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open this profile.');
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Any action: run it, refresh the view, keep the badge counts honest. */
  async function run(key: string, fn: () => Promise<unknown>, success: string) {
    setBusy(key);
    try {
      await fn();
      await load();
      await refresh();
      push('success', success);
    } catch (err) {
      push('error', err instanceof ApiError ? err.message : 'That did not go through. Try again.');
    } finally {
      setBusy(null);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <BackLink />
        <ErrorNote message={error} onRetry={load} />
        <EmptyState
          icon={<UserRound size={26} aria-hidden />}
          title="This profile is not open for you"
          body="It may have been paused, or it is not part of your search. Go back to the register and pick another profile."
          action={
            <Button variant="primary" onClick={() => router.push('/browse')}>
              Back to the register
            </Button>
          }
        />
      </div>
    );
  }

  if (!view) return <DetailSkeleton />;

  const { profile, connection: c, age, revealed } = view;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BackLink />

      {/* Header — the same identity row as a browse card, with the code as the name. */}
      <Card className="p-4">
        <div className="flex items-start gap-3.5">
          <GenderAvatar gender={profile.gender} size="sm" />
          <div className="min-w-0 flex-1">
            <h1 className="code text-[22px] font-bold leading-7 tracking-tight">{profile.publicCode}</h1>
            {revealed.fullName ? (
              <p className="text-[17px] font-bold leading-6">{revealed.fullName}</p>
            ) : null}
            <p className="mt-0.5 text-[15px] leading-6 text-ink">
              <span className="font-semibold">{age} yrs</span> · {formatHeightShort(profile.heightCm)}
            </p>
            <p className="flex items-center gap-1 text-[15px] leading-6 text-ink-2">
              <MapPin size={14} className="shrink-0 text-ink-3" aria-hidden />
              <span className="truncate">
                {profile.city}, {profile.district}, {profile.state}
              </span>
            </p>
          </div>

          <button
            type="button"
            disabled={busy === 'save'}
            onClick={() =>
              run(
                'save',
                () => api.toggleShortlist(profile.id),
                c.isShortlisted ? 'Removed from your saved list.' : 'Saved to your list.',
              )
            }
            aria-pressed={c.isShortlisted}
            aria-label={c.isShortlisted ? ACTIONS.unsave.en : ACTIONS.save.en}
            className={cx(
              'tap -mr-1.5 -mt-1.5 grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors duration-150 active:scale-95',
              c.isShortlisted
                ? 'bg-stamp-wash text-stamp'
                : 'text-ink-3 hover:bg-paper-deep hover:text-stamp',
            )}
          >
            {c.isShortlisted ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
          </button>
        </div>
      </Card>

      {/* Their request for your number is answered right here */}
      {c.pendingIncoming.contact ? (
        <Card className="bg-stamp-wash p-4 ring-stamp-ring!">
          <p className="text-[15px] font-bold leading-6 text-stamp-ink">
            {profile.publicCode} has asked for your phone number
            <span className="hindi block font-normal text-ink-2">इन्होंने आपका फ़ोन नंबर माँगा है</span>
          </p>
          <p className="mt-0.5 text-[13px] leading-5 text-ink-3">{timeAgo(c.pendingIncoming.contact.createdAt)}</p>
          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <Button
              variant="primary"
              fullWidth
              loading={busy === 'respond'}
              label={ACTIONS.shareContact}
              onClick={() =>
                run(
                  'respond',
                  () => api.respondToRequest(c.pendingIncoming.contact!.id, 'accept'),
                  `Your number is now with ${profile.publicCode}.`,
                )
              }
            />
            <Button
              variant="secondary"
              loading={busy === 'respond'}
              label={ACTIONS.decline}
              onClick={() =>
                run(
                  'respond',
                  () => api.respondToRequest(c.pendingIncoming.contact!.id, 'decline'),
                  'Number not shared.',
                )
              }
            />
          </div>
        </Card>
      ) : null}

      {/* Biodata — the ruled sheet */}
      <Card className="p-4">
        <SectionLabel en="Biodata" hi="बायोडाटा" />
        <div className="mt-1">
          <FieldRow label="Age" hindi="आयु">
            {age} years
          </FieldRow>
          <FieldRow label="Height" hindi="कद">
            {formatHeightShort(profile.heightCm)}
          </FieldRow>
          <FieldRow label="Weight" hindi="वज़न">
            {formatWeightBand(profile.weightBand)}
          </FieldRow>
          <FieldRow label="Skin tone" hindi="रंग">
            <span className="inline-flex items-center gap-2">
              <SkinToneDot tone={profile.complexion} />
              {COMPLEXION_LABELS[profile.complexion].en}
            </span>
          </FieldRow>
          <FieldRow label="Education" hindi="शिक्षा">
            {profile.education}
            {profile.educationLevel !== 'other' ? (
              <span className="block text-sm font-normal text-ink-3">
                {EDUCATION_LEVEL_LABELS[profile.educationLevel].en}
              </span>
            ) : null}
          </FieldRow>
          <FieldRow label="Work" hindi="काम">
            {profile.occupation}
            {profile.occupation !== OCCUPATION_LABELS[profile.occupationCategory].en ? (
              <span className="block text-sm font-normal text-ink-3">
                {OCCUPATION_LABELS[profile.occupationCategory].en}
              </span>
            ) : null}
          </FieldRow>
          <FieldRow label="Monthly income" hindi="मासिक आय">
            {INCOME_LABELS[profile.incomeBand].en}
          </FieldRow>
          <FieldRow label="Religion" hindi="धर्म">
            {RELIGION_LABELS[profile.religion].en}
          </FieldRow>
          <FieldRow label="Category" hindi="श्रेणी">
            {CATEGORY_LABELS[profile.category].en}
          </FieldRow>
          <FieldRow label="Jati" hindi="जाति">
            {profile.community}
          </FieldRow>
          <FieldRow label="Marital status" hindi="वैवाहिक स्थिति">
            {MARITAL_LABELS[profile.maritalStatus].en}
          </FieldRow>
          <FieldRow label="Manglik" hindi="मांगलिक">
            {MANGLIK_LABELS[profile.manglik].en}
          </FieldRow>
          {profile.village ? (
            <FieldRow label="Village / mohalla" hindi="गाँव / मोहल्ला">
              {profile.village}
            </FieldRow>
          ) : null}
          <FieldRow label="Tehsil" hindi="तहसील">
            {profile.city}
          </FieldRow>
          <FieldRow label="District" hindi="ज़िला">
            {profile.district}, {profile.state}
          </FieldRow>
        </div>
      </Card>

      {/* The one action */}
      <div
        className="sticky z-30 md:bottom-4"
        style={{ bottom: 'calc(76px + env(safe-area-inset-bottom, 0px) + 8px)' }}
      >
        <Card className="p-3 shadow-[var(--shadow-e3)] ring-rule-strong!">
          <StageActions
            view={view}
            busy={busy}
            onRequest={() =>
              run(
                'contact',
                () => api.sendRequest(profile.id, 'contact'),
                `Number requested from ${profile.publicCode}. They will decide.`,
              )
            }
            onWithdraw={() =>
              run(
                'withdraw',
                () => api.withdrawRequest(c.pendingOutgoing.contact!.id),
                'Request taken back.',
              )
            }
          />
        </Card>
      </div>

      <button
        type="button"
        onClick={() => setReportOpen(true)}
        className="tap mx-auto flex min-h-12 items-center justify-center gap-2 rounded-md px-4 text-[15px] font-semibold text-ink-2 hover:bg-paper-deep hover:text-oxide"
      >
        <Flag size={17} aria-hidden />
        {ACTIONS.report.en}
        <span className="hindi font-normal text-ink-3">{ACTIONS.report.hi}</span>
      </button>

      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        code={profile.publicCode}
        onSend={async (reason) => {
          setReportOpen(false);
          await run(
            'report',
            () => api.reportProfile(profile.id, reason),
            'Thank you. Our office will look into this profile.',
          );
        }}
      />
    </div>
  );
}

// --- pieces -----------------------------------------------------------------

function BackLink() {
  return (
    <Link
      href="/browse"
      className="tap -ml-2 inline-flex items-center gap-1.5 px-2 text-[15px] font-semibold text-ink-2"
    >
      <ArrowLeft size={20} aria-hidden />
      Back to the register
    </Link>
  );
}

/** The bar at the bottom: one button, or the number once it is open. */
function StageActions({
  view,
  busy,
  onRequest,
  onWithdraw,
}: {
  view: ProfileView;
  busy: string | null;
  onRequest: () => void;
  onWithdraw: () => void;
}) {
  const { connection: c, profile, revealed } = view;

  if (c.stage === 'number_shared' && revealed.phone) {
    return (
      <div>
        <p className="mb-2 text-center text-sm font-semibold text-seal">
          {profile.publicCode} shared their number with you.
        </p>
        <a
          href={`tel:${revealed.phone}`}
          className="code tap flex min-h-12 items-center justify-center gap-2 rounded-md bg-seal text-[17px] font-bold text-white shadow-[var(--shadow-e1)] transition-all hover:brightness-110 active:scale-[0.985]"
        >
          <Phone size={19} aria-hidden />
          {revealed.phone.replace('+91', '+91 ')}
        </a>
      </div>
    );
  }

  if (c.stage === 'request_sent') {
    return (
      <div className="sm:flex sm:items-center sm:gap-3">
        <p className="flex-1 text-[15px] font-medium text-ink-2">
          Number requested. Waiting for their answer.
          <span className="hindi block text-ink-3">नंबर माँगा गया। उत्तर की प्रतीक्षा है।</span>
        </p>
        <Button
          variant="secondary"
          className="mt-2 w-full sm:mt-0 sm:w-auto"
          loading={busy === 'withdraw'}
          label={ACTIONS.withdrawRequest}
          onClick={onWithdraw}
        />
      </div>
    );
  }

  if (c.stage === 'request_received') {
    return (
      <p className="text-center text-[15px] font-medium text-stamp-ink">
        Answer their request above.
      </p>
    );
  }

  if (c.cooldownUntil) {
    const days = daysUntil(c.cooldownUntil);
    return (
      <p className="flex items-start gap-2 text-[15px] font-medium text-oxide">
        <Clock size={20} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          This family declined earlier. You can ask again in {days} {days === 1 ? 'day' : 'days'}.
          <span className="hindi block font-normal text-ink-2">
            इस परिवार ने मना किया था। आप {days} दिन बाद फिर माँग सकते हैं।
          </span>
        </span>
      </p>
    );
  }

  return (
    <Button
      variant="primary"
      fullWidth
      loading={busy === 'contact'}
      icon={<Phone size={20} aria-hidden />}
      label={ACTIONS.askContact}
      onClick={onRequest}
    />
  );
}

function ReportSheet({
  open,
  onClose,
  code,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  code: string;
  onSend: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const presets = [
    'The details look false',
    'The person is already married',
    'They are asking for money',
    'Rude or improper messages',
  ];
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Report ${code}`}
      hindi="शिकायत करें"
      footer={
        <Button
          variant="danger"
          fullWidth
          onClick={() => {
            onSend(reason.trim());
            setReason('');
          }}
          disabled={!reason.trim()}
        >
          Send report to the office
        </Button>
      }
    >
      <p className="text-[15px] text-ink-2">
        Our office checks every report. Your name is not told to the other family.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setReason(p)}
            className={cx(
              'tap rounded-full px-4 py-2 text-left text-[15px] transition-colors duration-150',
              reason === p
                ? 'bg-oxide-wash text-oxide ring-1 ring-oxide ring-inset'
                : 'bg-card ring-1 ring-rule-strong ring-inset hover:bg-paper',
            )}
          >
            {p}
          </button>
        ))}
      </div>
      <TextArea
        className="mt-4"
        label="What is wrong?"
        hindi="क्या गलत है?"
        rows={3}
        maxLength={300}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
    </Sheet>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading profile">
      <Skeleton className="h-6 w-40" />
      <div className="rounded-2xl bg-card p-4 ring-1 ring-rule">
        <div className="flex gap-3">
          <Skeleton className="h-16 w-16" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl bg-card p-4 ring-1 ring-rule">
        <Skeleton className="h-5 w-28" />
        <div className="mt-3 space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

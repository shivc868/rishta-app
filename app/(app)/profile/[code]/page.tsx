'use client';

/**
 * Profile detail. Everything on this page is driven by `ProfileView` from the
 * API — the component decides layout, never permission. If a field is not in
 * `revealed`, there is nothing here that could print it.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Clock,
  Flag,
  Handshake,
  Hourglass,
  Image as ImageIcon,
  Lock,
  MapPin,
  Phone,
  ShieldCheck,
  Undo2,
  UserRound,
} from 'lucide-react';
import * as api from '@/lib/api';
import { ApiError } from '@/lib/api';
import type { ProfileView } from '@/types';
import {
  ACTIONS,
  DIET_LABELS,
  EDUCATION_LEVEL_LABELS,
  INCOME_LABELS,
  MANGLIK_LABELS,
  MARITAL_LABELS,
  OCCUPATION_LABELS,
  RELIGION_LABELS,
  daysUntil,
  formatHeight,
  formatWeightBand,
  timeAgo,
} from '@/lib/labels';
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  FieldRow,
  Sheet,
  Skeleton,
  Stamp,
  TextArea,
  cx,
} from '@/components/ui';
import { PhotoFrame } from '@/components/photo';
import { useSession, useToast } from '@/components/providers';

export default function ProfileDetailPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { push } = useToast();
  const { refresh } = useSession();

  const [view, setView] = useState<ProfileView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [interestOpen, setInterestOpen] = useState(false);
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
      <div className="space-y-4">
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

  const { profile, connection: c, age, distanceKm, revealed } = view;
  const photoToken = revealed.photoUrls?.[0];

  return (
    <div className="space-y-4 pb-4">
      <BackLink />

      {/* Header — the index card's ruled top strip */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <PhotoFrame
            token={photoToken}
            locked={!c.canSeePhotos}
            size="md"
            label={c.canSeePhotos ? `Photo of ${profile.publicCode}` : 'Photo is private'}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="code text-2xl font-bold leading-none tracking-tight">
                {profile.publicCode}
              </h1>
              {profile.isVerified ? (
                <Stamp
                  tone="seal"
                  title="Our office has seen the ID proof, the education certificate and confirmed the phone number."
                >
                  <ShieldCheck size={12} aria-hidden />
                  Verified
                </Stamp>
              ) : (
                <Stamp tone="ink" title="ID proof has not been checked by our office yet.">
                  Not yet verified
                </Stamp>
              )}
            </div>

            {revealed.fullName ? (
              <p className="mt-1.5 text-lg font-bold leading-tight">{revealed.fullName}</p>
            ) : c.canSeeContact ? null : (
              <p className="mt-1.5 flex items-center gap-1.5 text-[15px] text-ink-3">
                <Lock size={15} aria-hidden />
                Name opens with the phone number
              </p>
            )}

            <p className="mt-1 text-[15px] font-semibold text-ink">
              {age} yrs · {formatHeight(profile.heightCm)}
            </p>
            <p className="flex items-center gap-1 text-[15px] text-ink-2">
              <MapPin size={15} aria-hidden />
              {profile.city}
              {distanceKm > 0 ? ` · ${distanceKm} km away` : ' · same city'}
            </p>
            <p className="mt-1 text-sm text-ink-3">Active {timeAgo(profile.lastActiveAt)}</p>
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
              'tap grid h-11 w-11 shrink-0 place-items-center rounded-lg border-2',
              c.isShortlisted
                ? 'border-stamp bg-stamp-wash text-stamp'
                : 'border-rule-strong text-ink-3 hover:bg-paper',
            )}
          >
            {c.isShortlisted ? <BookmarkCheck size={22} /> : <Bookmark size={22} />}
          </button>
        </div>

        <StageStrip connection={c} />
      </Card>

      {/* Incoming requests are answered right here, in context */}
      {c.pendingIncoming.interest ? (
        <IncomingPanel
          title="This family has sent you an interest"
          hindi="इस परिवार ने आपको रुचि भेजी है"
          message={c.pendingIncoming.interest.message}
          when={c.pendingIncoming.interest.createdAt}
          acceptLabel={ACTIONS.accept}
          busy={busy === 'respond'}
          onAccept={() =>
            run(
              'respond',
              () => api.respondToRequest(c.pendingIncoming.interest!.id, 'accept'),
              `You are now connected with ${profile.publicCode}.`,
            )
          }
          onDecline={() =>
            run(
              'respond',
              () => api.respondToRequest(c.pendingIncoming.interest!.id, 'decline'),
              'Declined. They cannot ask again for 30 days.',
            )
          }
        />
      ) : null}

      {c.pendingIncoming.photo ? (
        <IncomingPanel
          title={`${profile.publicCode} has asked for your photo`}
          hindi="इन्होंने आपकी फ़ोटो माँगी है"
          message=""
          when={c.pendingIncoming.photo.createdAt}
          acceptLabel={ACTIONS.sharePhoto}
          note="They get to see your photo for 7 days. You can take it back at any time."
          busy={busy === 'respond'}
          onAccept={() =>
            run(
              'respond',
              () => api.respondToRequest(c.pendingIncoming.photo!.id, 'accept'),
              `Photo shared with ${profile.publicCode} for 7 days.`,
            )
          }
          onDecline={() =>
            run('respond', () => api.respondToRequest(c.pendingIncoming.photo!.id, 'decline'), 'Photo not shared.')
          }
        />
      ) : null}

      {c.pendingIncoming.contact ? (
        <IncomingPanel
          title={`${profile.publicCode} has asked for your phone number`}
          hindi="इन्होंने आपका फ़ोन नंबर माँगा है"
          message=""
          when={c.pendingIncoming.contact.createdAt}
          acceptLabel={ACTIONS.shareContact}
          note="Their number opens for you only after they share theirs as well."
          busy={busy === 'respond'}
          onAccept={() =>
            run(
              'respond',
              () => api.respondToRequest(c.pendingIncoming.contact!.id, 'accept'),
              `Your number is now with ${profile.publicCode}.`,
            )
          }
          onDecline={() =>
            run(
              'respond',
              () => api.respondToRequest(c.pendingIncoming.contact!.id, 'decline'),
              'Number not shared.',
            )
          }
        />
      ) : null}

      {/* Biodata — the ruled sheet */}
      <Card className="p-4">
        <SectionTitle en="Biodata" hi="बायोडाटा" />
        <div className="mt-2">
          <FieldRow label="Age" hindi="आयु">
            {age} years
          </FieldRow>
          <FieldRow label="Height" hindi="कद">
            {formatHeight(profile.heightCm)}
          </FieldRow>
          <FieldRow label="Weight" hindi="वज़न">
            {formatWeightBand(profile.weightBand)}
          </FieldRow>
          <FieldRow label="Education" hindi="शिक्षा">
            {profile.education}
            <span className="block text-sm font-normal text-ink-3">
              {EDUCATION_LEVEL_LABELS[profile.educationLevel].en}
            </span>
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
          <FieldRow label="Jati" hindi="जाति">
            {profile.community}
          </FieldRow>
          <FieldRow label="Marital status" hindi="वैवाहिक स्थिति">
            {MARITAL_LABELS[profile.maritalStatus].en}
          </FieldRow>
          <FieldRow label="Food" hindi="खान-पान">
            {DIET_LABELS[profile.diet].en}
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

      {profile.about ? (
        <Card className="p-4">
          <SectionTitle en="About" hi="परिचय" />
          <p className="mt-2 text-[15px] leading-relaxed text-ink">{profile.about}</p>
        </Card>
      ) : null}

      <Card className="p-4">
        <SectionTitle en="Family" hi="परिवार" />
        {profile.familyBrief ? (
          <p className="mt-2 text-[15px] leading-relaxed text-ink">{profile.familyBrief}</p>
        ) : null}

        {revealed.familyDetails ? (
          <div className="mt-3 border-t-2 border-dotted border-rule pt-3">
            <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-seal">
              <Handshake size={16} aria-hidden />
              Full family details — opened when you connected
            </p>
            <p className="text-[15px] leading-relaxed text-ink">{revealed.familyDetails}</p>
          </div>
        ) : (
          <LockedNote
            text="Full family details open after this family accepts your interest."
            hindi="पूरा पारिवारिक विवरण रुचि स्वीकार होने के बाद खुलता है।"
          />
        )}
      </Card>

      {/* Photo — stage 3 */}
      <Card className="p-4">
        <SectionTitle en="Photo" hi="फ़ोटो" />
        {c.canSeePhotos && revealed.photoUrls?.length ? (
          <>
            <p className="mt-1 text-sm font-semibold text-seal">
              Shared with you. Please do not save or forward it.
            </p>
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {revealed.photoUrls.map((token, i) => (
                <PhotoFrame
                  key={i}
                  token={token}
                  locked={false}
                  size="md"
                  label={`Photo ${i + 1} of ${profile.publicCode}`}
                  className="h-40 w-32"
                />
              ))}
            </div>
          </>
        ) : (
          <div className="mt-2 flex items-start gap-3">
            <PhotoFrame token={undefined} locked size="md" />
            <div className="flex-1">
              {c.stage !== 'connected' ? (
                <LockedNote
                  text="Photos open only after both families connect, and then only if this family approves."
                  hindi="फ़ोटो तभी खुलती है जब दोनों परिवार जुड़ें और यह परिवार मंज़ूरी दे।"
                />
              ) : c.pendingOutgoing.photo ? (
                <WaitingNote text={`Waiting for ${profile.publicCode} to approve your photo request.`} />
              ) : (
                <>
                  <p className="text-[15px] text-ink-2">
                    You can ask this family for a photo. They decide, and it stays with you for 7
                    days only.
                  </p>
                  <Button
                    variant="primary"
                    className="mt-3"
                    loading={busy === 'photo'}
                    icon={<ImageIcon size={20} aria-hidden />}
                    label={ACTIONS.askPhoto}
                    onClick={() =>
                      run(
                        'photo',
                        () => api.sendRequest(profile.id, 'photo'),
                        'Photo request sent. They will decide.',
                      )
                    }
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Owner-side view of what they gave away */}
        {c.photoGrantToThem ? (
          <div className="mt-3 border-2 border-seal/40 bg-seal-wash px-3 py-2.5 sm:flex sm:items-center sm:gap-3">
            <p className="flex-1 text-[15px] font-semibold text-seal">
              Photo shared with {profile.publicCode}
              {c.photoGrantToThem.expiresAt ? (
                <span className="font-normal">
                  {' '}
                  · expires in {daysUntil(c.photoGrantToThem.expiresAt)} days
                </span>
              ) : null}
            </p>
            <Button
              variant="danger"
              className="mt-2 w-full sm:mt-0 sm:w-auto"
              loading={busy === 'revoke'}
              icon={<Undo2 size={18} aria-hidden />}
              onClick={() =>
                run(
                  'revoke',
                  () => api.revokeGrant(c.photoGrantToThem!.id),
                  `${profile.publicCode} can no longer see your photo.`,
                )
              }
            >
              Take back
            </Button>
          </div>
        ) : null}
      </Card>

      {/* Contact — stage 4, the two-sided gate */}
      <Card className="p-4">
        <SectionTitle en="Phone number" hi="फ़ोन नंबर" />
        <ContactPanel
          view={view}
          busy={busy}
          onAsk={() =>
            run(
              'contact',
              () => api.sendRequest(profile.id, 'contact'),
              'Number request sent. They will decide.',
            )
          }
        />
      </Card>

      {/* Stage actions */}
      <div className="sticky bottom-20 z-30 md:bottom-4">
        <Card className="border-2 border-ink p-3 shadow-lg">
          <StageActions
            view={view}
            busy={busy}
            onSendInterest={() => setInterestOpen(true)}
            onWithdraw={() =>
              run(
                'withdraw',
                () => api.withdrawRequest(c.pendingOutgoing.interest!.id),
                'Interest taken back.',
              )
            }
          />
        </Card>
      </div>

      <button
        type="button"
        onClick={() => setReportOpen(true)}
        className="tap flex w-full items-center justify-center gap-2 text-[15px] font-semibold text-oxide underline"
      >
        <Flag size={18} aria-hidden />
        {ACTIONS.report.en}
        <span className="hindi font-normal">{ACTIONS.report.hi}</span>
      </button>

      <InterestSheet
        open={interestOpen}
        onClose={() => setInterestOpen(false)}
        code={profile.publicCode}
        onSend={async (message) => {
          setInterestOpen(false);
          await run(
            'interest',
            () => api.sendRequest(profile.id, 'interest', message),
            `Interest sent to ${profile.publicCode}.`,
          );
        }}
      />

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

function SectionTitle({ en, hi }: { en: string; hi: string }) {
  return (
    <h2 className="border-b-2 border-gold-soft pb-1 text-[15px] font-bold uppercase tracking-wide">
      {en}
      <span className="hindi ml-2 font-normal normal-case tracking-normal text-ink-3">{hi}</span>
    </h2>
  );
}

function LockedNote({ text, hindi }: { text: string; hindi?: string }) {
  return (
    <p className="mt-2 flex items-start gap-2 border-l-4 border-rule-strong bg-paper px-3 py-2 text-[15px] text-ink-2">
      <Lock size={17} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
      <span>
        {text}
        {hindi ? <span className="hindi block text-ink-3">{hindi}</span> : null}
      </span>
    </p>
  );
}

function WaitingNote({ text }: { text: string }) {
  return (
    <p className="mt-2 flex items-start gap-2 border-l-4 border-stamp bg-stamp-wash px-3 py-2 text-[15px] font-medium text-stamp-ink">
      <Hourglass size={17} className="mt-0.5 shrink-0" aria-hidden />
      {text}
    </p>
  );
}

/**
 * The four gates, in order. A step lights up only once it is actually open —
 * the strip is the answer to "how far along are we with this family?".
 */
function StageStrip({ connection: c }: { connection: ProfileView['connection'] }) {
  const steps = [
    { key: 'interest', en: 'Interest', hi: 'रुचि' },
    { key: 'connected', en: 'Connected', hi: 'जुड़े' },
    { key: 'photo', en: 'Photo', hi: 'फ़ोटो' },
    { key: 'contact', en: 'Number', hi: 'नंबर' },
  ];
  let reached =
    c.stage === 'connected'
      ? 2
      : c.stage === 'interest_sent' || c.stage === 'interest_received'
        ? 1
        : 0;
  if (reached === 2 && c.canSeePhotos) reached = 3;
  if (reached === 3 && c.canSeeContact) reached = 4;

  return (
    <ol className="mt-3 flex gap-1 border-t border-rule pt-3">
      {steps.map((s, i) => (
        <li key={s.key} className="flex-1">
          <div className={cx('h-1.5 rounded-full', i < reached ? 'bg-stamp' : 'bg-paper-deep')} />
          <span
            className={cx(
              'mt-1 block text-[11px] font-semibold leading-tight',
              i < reached ? 'text-stamp' : 'text-ink-3',
            )}
          >
            {s.en}
            <span className="hindi block font-normal">{s.hi}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function IncomingPanel({
  title,
  hindi,
  message,
  when,
  acceptLabel,
  note,
  busy,
  onAccept,
  onDecline,
}: {
  title: string;
  hindi: string;
  message: string;
  when: string;
  acceptLabel: { en: string; hi: string };
  note?: string;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <Card className="border-2 border-stamp bg-stamp-wash p-4">
      <p className="text-[15px] font-bold text-stamp-ink">
        {title}
        <span className="hindi block font-normal text-ink-2">{hindi}</span>
      </p>
      <p className="mt-1 text-sm text-ink-3">{timeAgo(when)}</p>
      {message ? (
        <blockquote className="mt-2 border-l-4 border-stamp/40 bg-card px-3 py-2 text-[15px] italic text-ink">
          &ldquo;{message}&rdquo;
        </blockquote>
      ) : null}
      {note ? <p className="mt-2 text-sm text-ink-2">{note}</p> : null}
      <div className="mt-3 flex gap-2">
        <Button variant="primary" fullWidth loading={busy} label={acceptLabel} onClick={onAccept} />
        <Button variant="danger" loading={busy} label={ACTIONS.decline} onClick={onDecline} />
      </div>
    </Card>
  );
}

/**
 * The mutual-consent gate, spelled out. Both halves are always shown — a parent
 * has to be able to see that they gave, and that the other side has not yet.
 */
function ContactPanel({
  view,
  busy,
  onAsk,
}: {
  view: ProfileView;
  busy: string | null;
  onAsk: () => void;
}) {
  const { connection: c, revealed, profile } = view;

  if (c.canSeeContact && revealed.phone) {
    return (
      <div className="mt-2">
        <p className="flex items-center gap-2 text-sm font-bold text-seal">
          <ShieldCheck size={16} aria-hidden />
          Both families have shared. You may call now.
        </p>
        <a
          href={`tel:${revealed.phone}`}
          className="code tap mt-2 flex items-center justify-center gap-2 border-2 border-seal bg-seal-wash py-3 text-xl font-bold text-seal"
        >
          <Phone size={22} aria-hidden />
          {revealed.phone.replace('+91', '+91 ')}
        </a>
        {revealed.exactAddress ? (
          <p className="mt-2 flex items-start gap-2 text-[15px] text-ink-2">
            <MapPin size={17} className="mt-0.5 shrink-0" aria-hidden />
            {revealed.exactAddress}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-2">
      <p className="code text-xl font-bold text-ink-3">{revealed.phoneMasked}</p>

      <ul className="mt-3 space-y-2">
        <li className="flex items-center gap-2 text-[15px]">
          <StatusDot on={c.theySharedContact} />
          <span className={c.theySharedContact ? 'text-ink' : 'text-ink-2'}>
            {profile.publicCode} {c.theySharedContact ? 'has shared their number' : 'has not shared yet'}
          </span>
        </li>
        <li className="flex items-center gap-2 text-[15px]">
          <StatusDot on={c.iSharedContact} />
          <span className={c.iSharedContact ? 'text-ink' : 'text-ink-2'}>
            You {c.iSharedContact ? 'have shared your number' : 'have not shared yours yet'}
          </span>
        </li>
      </ul>

      {c.stage !== 'connected' ? (
        <LockedNote
          text="Phone numbers open only after both families accept an interest and then both agree to share."
          hindi="नंबर तभी खुलते हैं जब दोनों परिवार सहमत हों।"
        />
      ) : c.theySharedContact && !c.iSharedContact ? (
        <WaitingNote
          text={`${profile.publicCode} has shared their number. It opens for you once you share yours too — they will ask you, or you can ask them.`}
        />
      ) : c.iSharedContact && !c.theySharedContact ? (
        <WaitingNote text={`Waiting for ${profile.publicCode} to also share their number.`} />
      ) : c.pendingOutgoing.contact ? (
        <WaitingNote text={`Waiting for ${profile.publicCode} to answer your number request.`} />
      ) : (
        <>
          <p className="mt-3 text-[15px] text-ink-2">
            Numbers open only when both sides agree. Nothing is shown one-sided.
          </p>
          <Button
            variant="primary"
            className="mt-3"
            loading={busy === 'contact'}
            icon={<Phone size={20} aria-hidden />}
            label={ACTIONS.askContact}
            onClick={onAsk}
          />
        </>
      )}
    </div>
  );
}

function StatusDot({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2',
        on ? 'border-seal bg-seal text-white' : 'border-rule-strong bg-card',
      )}
    >
      {on ? <ShieldCheck size={12} strokeWidth={3} /> : null}
    </span>
  );
}

/** The primary action for the current stage — and only that stage. */
function StageActions({
  view,
  busy,
  onSendInterest,
  onWithdraw,
}: {
  view: ProfileView;
  busy: string | null;
  onSendInterest: () => void;
  onWithdraw: () => void;
}) {
  const { connection: c, profile } = view;

  if (c.stage === 'connected') {
    return (
      <p className="flex items-center justify-center gap-2 py-1 text-[15px] font-bold text-seal">
        <Handshake size={20} aria-hidden />
        You are connected with {profile.publicCode}
        <span className="hindi font-normal text-ink-2">आप जुड़े हुए हैं</span>
      </p>
    );
  }

  if (c.stage === 'interest_sent') {
    return (
      <div className="sm:flex sm:items-center sm:gap-3">
        <p className="flex-1 text-[15px] font-medium text-ink-2">
          Interest sent. Waiting for their answer.
          <span className="hindi block text-ink-3">रुचि भेजी गई। उत्तर की प्रतीक्षा है।</span>
        </p>
        <Button
          variant="danger"
          className="mt-2 w-full sm:mt-0 sm:w-auto"
          loading={busy === 'withdraw'}
          label={ACTIONS.withdrawInterest}
          onClick={onWithdraw}
        />
      </div>
    );
  }

  if (c.stage === 'interest_received') {
    return (
      <p className="text-center text-[15px] font-medium text-stamp-ink">
        Answer their interest above to connect.
      </p>
    );
  }

  if (c.cooldownUntil) {
    const days = daysUntil(c.cooldownUntil);
    return (
      <p className="flex items-start gap-2 text-[15px] font-medium text-oxide">
        <Clock size={20} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          This family declined earlier. You can send interest again in {days}{' '}
          {days === 1 ? 'day' : 'days'}.
          <span className="hindi block font-normal text-ink-2">
            इस परिवार ने मना किया था। आप {days} दिन बाद फिर रुचि भेज सकते हैं।
          </span>
        </span>
      </p>
    );
  }

  if (c.stage === 'declined_by_me') {
    return (
      <p className="text-center text-[15px] font-medium text-ink-2">
        You declined this family&rsquo;s interest.
      </p>
    );
  }

  return (
    <Button
      variant="primary"
      fullWidth
      loading={busy === 'interest'}
      label={ACTIONS.sendInterest}
      onClick={onSendInterest}
    />
  );
}

function InterestSheet({
  open,
  onClose,
  code,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  code: string;
  onSend: (message: string) => void;
}) {
  const [message, setMessage] = useState('');
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Send interest to ${code}`}
      hindi="रुचि भेजें"
      footer={
        <Button
          variant="primary"
          fullWidth
          label={ACTIONS.sendInterest}
          onClick={() => {
            onSend(message.trim());
            setMessage('');
          }}
        />
      }
    >
      <p className="text-[15px] text-ink-2">
        They will see your profile code and this message. Your photo and number stay private.
        <span className="hindi block text-ink-3">
          उन्हें आपका कोड और यह संदेश दिखेगा। फ़ोटो और नंबर निजी रहेंगे।
        </span>
      </p>
      <TextArea
        className="mt-4"
        label="Message (optional)"
        hindi="संदेश (वैकल्पिक)"
        rows={4}
        maxLength={200}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="We liked the biodata. Family background looks similar. Please consider."
        hint="Do not write your phone number here."
      />
    </Sheet>
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
              'tap rounded-lg border-2 px-3 py-2 text-left text-[15px]',
              reason === p ? 'border-oxide bg-oxide-wash text-oxide' : 'border-rule-strong bg-card',
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
      <div className="border border-rule bg-card p-4">
        <div className="flex gap-3">
          <Skeleton className="h-28 w-24" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <Skeleton className="mt-4 h-8 w-full" />
      </div>
      <div className="border border-rule bg-card p-4">
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

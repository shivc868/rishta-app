'use client';

/**
 * Settings is where a parent goes when they are worried — so the two things
 * they are worried about (who can see our photo, take our profile down) are at
 * the top, not buried under account rows.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye,
  Image as ImageIcon,
  LogOut,
  Pause,
  Phone,
  Play,
  RotateCcw,
  ShieldCheck,
  Undo2,
  UserRoundCog,
} from 'lucide-react';
import * as api from '@/lib/api';
import { ApiError } from '@/lib/api';
import type { OutgoingGrantView, Profile } from '@/types';
import { GENDER_LABELS, STATUS_LABELS, ACTIONS } from '@/lib/labels';
import { Button, Card, ErrorNote, Skeleton, Stamp, cx } from '@/components/ui';
import { useSession, useToast } from '@/components/providers';

export default function SettingsPage() {
  const router = useRouter();
  const { push } = useToast();
  const { activeProfile, myProfiles, refresh } = useSession();

  const [grants, setGrants] = useState<OutgoingGrantView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadGrants = useCallback(async () => {
    setError(null);
    try {
      setGrants(await api.getOutgoingGrants());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load who has access.');
    }
  }, []);

  useEffect(() => {
    void loadGrants();
  }, [loadGrants, activeProfile?.id]);

  async function run(key: string, fn: () => Promise<unknown>, success: string) {
    setBusy(key);
    try {
      await fn();
      await refresh();
      await loadGrants();
      push('success', success);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work. Try again.');
    } finally {
      setBusy(null);
    }
  }

  if (!activeProfile) return null;

  const paused = activeProfile.status === 'paused';

  return (
    <div className="space-y-5 pb-4">
      <h1 className="text-xl font-bold leading-tight">
        Settings
        <span className="hindi block font-normal text-ink-3">सेटिंग</span>
      </h1>

      {error ? <ErrorNote message={error} onRetry={loadGrants} /> : null}

      {/* Profile switcher — one account, several children */}
      <Card className="p-4">
        <SectionTitle en="Whose rishta are you looking for?" hi="आप किसका रिश्ता देख रहे हैं?" />
        <p className="mt-2 text-[15px] text-ink-2">
          One account can hold more than one biodata. You only see profiles for the one chosen here.
        </p>
        <ul className="mt-3 space-y-2">
          {myProfiles.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                disabled={busy === `switch-${p.id}`}
                onClick={() =>
                  run(
                    `switch-${p.id}`,
                    () => api.switchActiveProfile(p.id),
                    `Now searching for ${p.publicCode}.`,
                  )
                }
                aria-pressed={p.id === activeProfile.id}
                className={cx(
                  'tap flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left',
                  p.id === activeProfile.id
                    ? 'border-stamp bg-stamp-wash'
                    : 'border-rule-strong bg-card hover:bg-paper',
                )}
              >
                <UserRoundCog size={22} className="shrink-0 text-ink-2" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="code block text-[15px] font-bold">{p.publicCode}</span>
                  <span className="block text-sm text-ink-2">
                    {GENDER_LABELS[p.gender].en} · {p.education} · {p.city}
                  </span>
                </span>
                <ProfileStatusStamp profile={p} />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {/* Who can see what */}
      <Card className="p-4">
        <SectionTitle en="Who can see your details" hi="आपकी जानकारी कौन देख सकता है" />
        <p className="mt-2 text-[15px] text-ink-2">
          Everything you have shared, and a way to take it back at any time.
        </p>

        <div className="mt-3">
          {grants === null ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : grants.length === 0 ? (
            <p className="flex items-start gap-2 border-2 border-dashed border-rule-strong bg-paper px-3 py-4 text-[15px] text-ink-2">
              <ShieldCheck size={20} className="mt-0.5 shrink-0 text-seal" aria-hidden />
              <span>
                Nobody has access to your photo or number right now.
                <span className="hindi block text-ink-3">
                  अभी किसी के पास आपकी फ़ोटो या नंबर नहीं है।
                </span>
              </span>
            </p>
          ) : (
            <ul className="space-y-2">
              {grants.map(({ grant, granteeCode, expiresInDays }) => (
                <li
                  key={grant.id}
                  className="border-2 border-seal/40 bg-seal-wash px-3 py-2.5 sm:flex sm:items-center sm:gap-3"
                >
                  <span className="mb-1 inline-block shrink-0 text-seal sm:mb-0">
                    {grant.scope === 'photo' ? (
                      <ImageIcon size={20} aria-hidden />
                    ) : (
                      <Phone size={20} aria-hidden />
                    )}
                  </span>
                  <span className="block min-w-0 flex-1 text-[15px] font-semibold text-seal">
                    {grant.scope === 'photo' ? 'Photo' : 'Phone number'} shared with{' '}
                    <span className="code">{granteeCode}</span>
                    <span className="block font-normal text-ink-2">
                      {expiresInDays === null
                        ? 'Stays open until you take it back'
                        : `Expires in ${expiresInDays} ${expiresInDays === 1 ? 'day' : 'days'}`}
                    </span>
                  </span>
                  <Button
                    variant="danger"
                    className="mt-2 w-full sm:mt-0 sm:w-auto"
                    loading={busy === `revoke-${grant.id}`}
                    icon={<Undo2 size={18} aria-hidden />}
                    onClick={() =>
                      run(
                        `revoke-${grant.id}`,
                        () => api.revokeGrant(grant.id),
                        `${granteeCode} can no longer see your ${grant.scope === 'photo' ? 'photo' : 'number'}.`,
                      )
                    }
                  >
                    {ACTIONS.revoke.en}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Pause */}
      <Card className="p-4">
        <SectionTitle en="Your profile in the register" hi="रजिस्टर में आपकी प्रोफ़ाइल" />
        <div className="mt-3 sm:flex sm:items-center sm:gap-3">
          <span className="block flex-1 text-[15px]">
            <span className="code font-bold">{activeProfile.publicCode}</span> is currently{' '}
            <strong>{STATUS_LABELS[activeProfile.status].en.toLowerCase()}</strong>.
            <span className="block text-ink-2">
              {paused
                ? 'Nobody can find your profile while it is paused. Requests already sent stay as they are.'
                : 'Families searching in the register can find your profile.'}
            </span>
          </span>
          <Button
            variant={paused ? 'primary' : 'secondary'}
            className="mt-3 w-full sm:mt-0 sm:w-auto"
            loading={busy === 'status'}
            icon={paused ? <Play size={20} aria-hidden /> : <Pause size={20} aria-hidden />}
            label={
              paused
                ? { en: 'Show my profile again', hi: 'प्रोफ़ाइल फिर दिखाएँ' }
                : { en: 'Pause my profile', hi: 'प्रोफ़ाइल रोकें' }
            }
            onClick={() =>
              run(
                'status',
                () => api.setProfileStatus(activeProfile.id, paused ? 'active' : 'paused'),
                paused ? 'Your profile is live again.' : 'Your profile is paused.',
              )
            }
          />
        </div>
      </Card>

      {/* Privacy reminder */}
      <Card className="border-2 border-seal/40 bg-seal-wash p-4">
        <p className="flex items-start gap-2 text-[15px] font-semibold text-seal">
          <Eye size={20} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            In search, other families see only your code, age, height, education, work, community and
            city. Never your name, photo, number or address.
            <span className="hindi mt-1 block font-normal text-ink-2">
              खोज में केवल कोड, आयु, कद, शिक्षा, काम, समाज और शहर दिखते हैं।
            </span>
          </span>
        </p>
      </Card>

      {/* Account */}
      <Card className="p-4">
        <SectionTitle en="Account" hi="खाता" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            icon={<LogOut size={20} aria-hidden />}
            loading={busy === 'signout'}
            onClick={async () => {
              setBusy('signout');
              await api.signOut();
              await refresh();
              router.replace('/login');
            }}
          >
            Sign out
          </Button>
        </div>
      </Card>

      {/* Dev-only */}
      <Card className="border-2 border-dashed border-rule-strong bg-paper p-4">
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

function SectionTitle({ en, hi }: { en: string; hi: string }) {
  return (
    <h2 className="border-b-2 border-gold-soft pb-1 text-[15px] font-bold uppercase tracking-wide">
      {en}
      <span className="hindi ml-2 font-normal normal-case tracking-normal text-ink-3">{hi}</span>
    </h2>
  );
}

function ProfileStatusStamp({ profile }: { profile: Profile }) {
  const tone =
    profile.status === 'active' ? 'seal' : profile.status === 'pending_review' ? 'stamp' : 'ink';
  return <Stamp tone={tone}>{STATUS_LABELS[profile.status].en}</Stamp>;
}

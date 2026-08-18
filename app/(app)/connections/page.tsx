'use client';

/**
 * Accepted pairs. Each row shows exactly how far the unlock has gone, in both
 * directions, so nobody has to open the profile to find out whether they are
 * waiting on the other family or the other family is waiting on them.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Handshake, Image as ImageIcon, Phone, Users } from 'lucide-react';
import * as api from '@/lib/api';
import { ApiError } from '@/lib/api';
import type { ConnectionSummary } from '@/types';
import { formatHeightShort, timeAgo } from '@/lib/labels';
import { Button, Card, EmptyState, ErrorNote, Skeleton, Stamp, cx } from '@/components/ui';
import { GenderAvatar } from '@/components/avatar';

export default function ConnectionsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ConnectionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await api.getConnections();
      setRows(next);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open your connections.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h1 className="text-xl font-bold leading-tight">
        Connected families
        <span className="hindi block font-normal text-ink-3">जुड़े हुए परिवार</span>
      </h1>
      <p className="mt-1 text-[15px] text-ink-2">
        Both sides accepted an interest. Photos and numbers still need separate approval.
      </p>

      <div className="mt-4">
        {error ? (
          <ErrorNote message={error} onRetry={load} />
        ) : rows === null ? (
          <ul className="space-y-3" aria-busy="true" aria-label="Loading connections">
            {Array.from({ length: 2 }, (_, i) => (
              <li key={i} className="border border-rule bg-card p-3">
                <div className="flex gap-3">
                  <Skeleton className="h-16 w-16" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-28" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
                <Skeleton className="mt-3 h-16 w-full" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Users size={26} aria-hidden />}
            title="No connected families yet"
            hindi="अभी कोई परिवार जुड़ा नहीं"
            body="A connection starts when you send an interest and the other family accepts, or when you accept theirs."
            action={
              <Button variant="primary" onClick={() => router.push('/browse')}>
                Look at profiles
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {rows.map(({ profile, age, connection: c, connectedAt }) => (
              <Card as="li" key={profile.id} className="p-3">
                <div className="flex gap-3">
                  <GenderAvatar gender={profile.gender} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/profile/${profile.publicCode}`} className="code text-lg font-bold">
                        {profile.publicCode}
                      </Link>
                      <Stamp tone="seal">
                        <Handshake size={12} aria-hidden />
                        Connected
                      </Stamp>
                    </div>
                    <p className="mt-1 text-[15px] text-ink-2">
                      {age} yrs · {formatHeightShort(profile.heightCm)} · {profile.occupation}
                    </p>
                    <p className="text-sm text-ink-3">Connected {timeAgo(connectedAt)}</p>
                  </div>
                </div>

                {/* Per-pair unlock status, both directions */}
                <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-dotted border-rule pt-3 text-sm">
                  <UnlockCell
                    icon={<ImageIcon size={16} aria-hidden />}
                    label="Their photo"
                    on={c.canSeePhotos}
                    onText="Shared with you"
                    offText={c.pendingOutgoing.photo ? 'You asked — waiting' : 'Not shared'}
                  />
                  <UnlockCell
                    icon={<ImageIcon size={16} aria-hidden />}
                    label="Your photo"
                    on={c.theyCanSeeMyPhotos}
                    onText="Shared with them"
                    offText={c.pendingIncoming.photo ? 'They asked — answer it' : 'Not shared'}
                  />
                  <UnlockCell
                    icon={<Phone size={16} aria-hidden />}
                    label="Their number"
                    on={c.canSeeContact}
                    onText="Open"
                    offText={
                      c.theySharedContact
                        ? 'They shared — share yours'
                        : c.pendingOutgoing.contact
                          ? 'You asked — waiting'
                          : 'Not shared'
                    }
                  />
                  <UnlockCell
                    icon={<Phone size={16} aria-hidden />}
                    label="Your number"
                    on={c.iSharedContact}
                    onText="Shared with them"
                    offText={c.pendingIncoming.contact ? 'They asked — answer it' : 'Not shared'}
                  />
                </dl>

                {c.iSharedContact && !c.theySharedContact ? (
                  <p className="mt-2 border-l-4 border-stamp bg-stamp-wash px-3 py-2 text-[15px] font-medium text-stamp-ink">
                    Waiting for {profile.publicCode} to also share their number.
                  </p>
                ) : null}

                <Button
                  className="mt-3"
                  fullWidth
                  onClick={() => router.push(`/profile/${profile.publicCode}`)}
                >
                  Open this profile
                </Button>
              </Card>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function UnlockCell({
  icon,
  label,
  on,
  onText,
  offText,
}: {
  icon: React.ReactNode;
  label: string;
  on: boolean;
  onText: string;
  offText: string;
}) {
  return (
    <div className={cx('border-l-4 px-2 py-1', on ? 'border-seal bg-seal-wash' : 'border-rule bg-paper')}>
      <dt className="flex items-center gap-1.5 font-semibold text-ink-2">
        {icon}
        {label}
      </dt>
      <dd className={cx('mt-0.5 font-medium', on ? 'text-seal' : 'text-ink-3')}>
        {on ? onText : offText}
      </dd>
    </div>
  );
}

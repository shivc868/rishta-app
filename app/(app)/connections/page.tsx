'use client';

/**
 * Families a number has passed between — in either direction. Each row says
 * plainly whether you have their number, whether they have yours, and gives
 * a call button the moment theirs is open.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Clock, Phone, Users } from 'lucide-react';
import * as api from '@/lib/api';
import { ApiError } from '@/lib/api';
import type { ConnectionSummary } from '@/types';
import { formatHeightShort, timeAgo } from '@/lib/labels';
import { Button, Card, EmptyState, ErrorNote, PageHeader, Skeleton, Stamp, cx } from '@/components/ui';
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
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Connected"
        hindi="जुड़े हुए परिवार"
        lead="Families you have exchanged numbers with."
      />

      <div>
        {error ? (
          <ErrorNote message={error} onRetry={load} />
        ) : rows === null ? (
          <ul className="space-y-3" aria-busy="true" aria-label="Loading connections">
            {Array.from({ length: 2 }, (_, i) => (
              <li key={i} className="rounded-2xl bg-card p-4 ring-1 ring-rule">
                <div className="flex gap-3">
                  <Skeleton className="h-14 w-14" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-28" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
                <Skeleton className="mt-3 h-12 w-full" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Users size={26} aria-hidden />}
            title="No connected families yet"
            hindi="अभी कोई परिवार जुड़ा नहीं"
            body="A family appears here once you share your number with them, or they share theirs with you."
            action={
              <Button variant="primary" onClick={() => router.push('/browse')}>
                Look at profiles
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {rows.map(({ profile, age, connection: c, connectedAt, phone }) => (
              <Card as="li" key={profile.id} className="p-4">
                <div className="flex gap-3">
                  <GenderAvatar gender={profile.gender} size="xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/profile/${profile.publicCode}`} className="code text-lg font-bold leading-6">
                        {profile.publicCode}
                      </Link>
                      {c.canSeeContact ? <Stamp tone="seal">Number shared</Stamp> : null}
                    </div>
                    <p className="mt-0.5 text-[15px] leading-6 text-ink-2">
                      {age} yrs · {formatHeightShort(profile.heightCm)} · {profile.city}
                    </p>
                    <p className="text-[13px] leading-5 text-ink-3">Since {timeAgo(connectedAt)}</p>
                  </div>
                </div>

                {/* Two facts, one line each, on the same hairline grid as every list. */}
                <dl className="mt-4 border-y border-rule">
                  <Cell
                    label="Their number"
                    on={c.canSeeContact}
                    onText="Shared with you"
                    offText={c.pendingOutgoing.contact ? 'You asked, waiting' : 'Not shared'}
                  />
                  <Cell
                    label="Your number"
                    on={c.iSharedContact}
                    onText="Shared with them"
                    offText={c.pendingIncoming.contact ? 'They asked, answer it' : 'Not shared'}
                  />
                </dl>

                {phone ? (
                  <a
                    href={`tel:${phone}`}
                    className="code tap mt-4 flex min-h-12 items-center justify-center gap-2 rounded-md bg-seal text-[17px] font-bold text-white shadow-[var(--shadow-e1)] transition-all hover:brightness-110 active:scale-[0.985]"
                  >
                    <Phone size={19} aria-hidden />
                    {phone.replace('+91', '+91 ')}
                  </a>
                ) : (
                  <Button
                    className="mt-4"
                    fullWidth
                    onClick={() => router.push(`/profile/${profile.publicCode}`)}
                  >
                    Open this profile
                  </Button>
                )}
              </Card>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Cell({
  label,
  on,
  onText,
  offText,
}: {
  label: string;
  on: boolean;
  onText: string;
  offText: string;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-b border-rule py-2.5 last:border-b-0">
      <dt className="text-[13px] font-medium text-ink-3">{label}</dt>
      <dd
        className={cx(
          'flex items-center gap-1.5 text-[15px] font-semibold leading-5',
          on ? 'text-seal' : 'text-ink-2',
        )}
      >
        {on ? <Check size={15} aria-hidden /> : <Clock size={15} className="text-ink-3" aria-hidden />}
        {on ? onText : offText}
      </dd>
    </div>
  );
}

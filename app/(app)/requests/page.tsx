'use client';

/**
 * Received / Sent, as two tabbed dividers in a card drawer.
 *
 * Accept, Decline and Withdraw are optimistic: the row changes the instant it
 * is tapped, and rolls back with an explanation if the write fails.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Inbox, Send, ShieldCheck } from 'lucide-react';
import * as api from '@/lib/api';
import { ApiError } from '@/lib/api';
import type { RequestStatus, RequestView } from '@/types';
import {
  ACTIONS,
  formatHeightShort,
  timeAgo,
} from '@/lib/labels';
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  PageHeader,
  SectionLabel,
  Segmented,
  Skeleton,
  Stamp,
} from '@/components/ui';
import { GenderAvatar } from '@/components/avatar';
import { useSession, useToast } from '@/components/providers';

type Tab = 'received' | 'sent';

export default function RequestsPage() {
  const router = useRouter();
  const { push } = useToast();
  const { refresh, pending } = useSession();
  const [tab, setTab] = useState<Tab>('received');
  const [rows, setRows] = useState<RequestView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setRows(null);
    try {
      setRows(await api.getRequests(tab));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not open your requests. Try again.',
      );
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(
    row: RequestView,
    optimisticStatus: RequestStatus,
    fn: () => Promise<unknown>,
    success: string,
  ) {
    const before = rows;
    setBusyId(row.request.id);
    setRows(
      (prev) =>
        prev?.map((r) =>
          r.request.id === row.request.id
            ? { ...r, request: { ...r.request, status: optimisticStatus } }
            : r,
        ) ?? prev,
    );
    try {
      await fn();
      push('success', success);
      await refresh();
      await load();
    } catch (err) {
      setRows(before);
      push('error', err instanceof ApiError ? err.message : 'That did not go through. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  const pendingRows = rows?.filter((r) => r.request.status === 'pending') ?? [];
  const doneRows = rows?.filter((r) => r.request.status !== 'pending') ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Requests"
        hindi="निवेदन"
        lead="Families asking for your number, and the numbers you have asked for."
      />

      <Segmented
        label="Requests"
        value={tab}
        onChange={setTab}
        items={[
          {
            key: 'received',
            label: 'Received',
            icon: <Inbox size={17} aria-hidden />,
            count: pending.received,
          },
          { key: 'sent', label: 'Sent', icon: <Send size={17} aria-hidden />, count: pending.sent },
        ]}
      />

      <div className="pt-4">
        {error ? (
          <ErrorNote message={error} onRetry={load} />
        ) : rows === null ? (
          <RequestsSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={tab === 'received' ? <Inbox size={26} /> : <Send size={26} />}
            title={tab === 'received' ? 'No requests yet' : 'You have not requested any number yet'}
            hindi={tab === 'received' ? 'अभी कोई निवेदन नहीं' : 'आपने अभी कोई नंबर नहीं माँगा'}
            body={
              tab === 'received'
                ? 'When a family asks for your number, it will appear here for you to share or decline.'
                : 'Open the register, find a profile you like, and request the number. It will show here until they answer.'
            }
            action={
              <Button variant="primary" onClick={() => router.push('/browse')}>
                {tab === 'received' ? 'Look at profiles' : 'Find a profile'}
              </Button>
            }
          />
        ) : (
          <div className="space-y-5">
            {pendingRows.length > 0 && (
              <section>
                <SectionLabel
                  en={tab === 'received' ? 'Needs your answer' : 'Waiting for their answer'}
                  hi={tab === 'received' ? 'उत्तर चाहिए' : 'उत्तर की प्रतीक्षा'}
                  className="mb-2"
                />
                <ul className="space-y-3">
                  {pendingRows.map((row) => (
                    <RequestRow
                      key={row.request.id}
                      row={row}
                      busy={busyId === row.request.id}
                      onAccept={() =>
                        act(
                          row,
                          'accepted',
                          () => api.respondToRequest(row.request.id, 'accept'),
                          acceptMessage(row),
                        )
                      }
                      onDecline={() =>
                        act(
                          row,
                          'declined',
                          () => api.respondToRequest(row.request.id, 'decline'),
                          'Declined. They cannot ask again for 30 days.',
                        )
                      }
                      onWithdraw={() =>
                        act(
                          row,
                          'withdrawn',
                          () => api.withdrawRequest(row.request.id),
                          'Request taken back.',
                        )
                      }
                    />
                  ))}
                </ul>
              </section>
            )}

            {doneRows.length > 0 && (
              <section>
                <SectionLabel en="Answered" hi="उत्तर मिल गया" className="mb-2" />
                <ul className="space-y-3">
                  {doneRows.map((row) => (
                    <RequestRow key={row.request.id} row={row} busy={false} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 flex items-start gap-2 text-[13px] leading-5 text-ink-3">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-seal" aria-hidden />
        Sharing gives that family your number only. Nothing else about you opens.
      </p>
    </div>
  );
}

function acceptMessage(row: RequestView): string {
  return `Your number is now with ${row.otherProfile.publicCode}.`;
}

const STATUS_STAMP: Record<RequestStatus, { label: string; tone: 'seal' | 'oxide' | 'ink' | 'stamp' }> = {
  pending: { label: 'Waiting', tone: 'stamp' },
  accepted: { label: 'Accepted', tone: 'seal' },
  declined: { label: 'Declined', tone: 'oxide' },
  withdrawn: { label: 'Taken back', tone: 'ink' },
};

function RequestRow({
  row,
  busy,
  onAccept,
  onDecline,
  onWithdraw,
}: {
  row: RequestView;
  busy: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onWithdraw?: () => void;
}) {
  const { request, otherProfile: p, age, isIncoming } = row;
  const stamp = STATUS_STAMP[request.status];
  const acceptLabel = ACTIONS.shareContact;

  return (
    <Card as="li" className="p-4">
      <div className="flex gap-3">
        <GenderAvatar gender={p.gender} size="xs" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <Link href={`/profile/${p.publicCode}`} className="code text-lg font-bold leading-6">
              {p.publicCode}
            </Link>
            <Stamp tone={stamp.tone}>{stamp.label}</Stamp>
          </div>
          <p className="mt-0.5 text-[15px] leading-6 text-ink-2">
            {age} yrs · {formatHeightShort(p.heightCm)} · {p.education} · {p.city}
          </p>
          <p className="text-[13px] leading-5 text-ink-3">
            {isIncoming ? 'Received' : 'Sent'} {timeAgo(request.createdAt)}
          </p>
        </div>
      </div>
      {request.message ? (
        <blockquote className="mt-3 rounded-md bg-paper px-3.5 py-2.5 text-[15px] leading-6 text-ink-2">
          &ldquo;{request.message}&rdquo;
        </blockquote>
      ) : null}

      {request.status === 'pending' ? (
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          {isIncoming ? (
            <>
              <Button variant="primary" fullWidth loading={busy} label={acceptLabel} onClick={onAccept} />
              <Button variant="secondary" loading={busy} label={ACTIONS.decline} onClick={onDecline} />
            </>
          ) : (
            <Button
              variant="secondary"
              className="col-span-2"
              loading={busy}
              label={ACTIONS.withdrawRequest}
              onClick={onWithdraw}
            />
          )}
        </div>
      ) : null}

      {request.status === 'declined' && !isIncoming ? (
        <p className="mt-3 text-[13px] leading-5 text-ink-3">
          You can ask this family again after 30 days from{' '}
          {request.respondedAt ? timeAgo(request.respondedAt) : 'the reply'}.
        </p>
      ) : null}
    </Card>
  );
}

function RequestsSkeleton() {
  return (
    <ul className="space-y-3" aria-busy="true" aria-label="Loading requests">
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className="rounded-2xl bg-card p-4 ring-1 ring-rule">
          <div className="flex gap-3">
            <Skeleton className="h-14 w-14" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <Skeleton className="mt-3 h-12 w-full" />
        </li>
      ))}
    </ul>
  );
}

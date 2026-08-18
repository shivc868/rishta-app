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
  REQUEST_TYPE_LABELS,
  formatHeightShort,
  timeAgo,
} from '@/lib/labels';
import { Button, Card, EmptyState, ErrorNote, Skeleton, Stamp, cx } from '@/components/ui';
import { GenderAvatar } from '@/components/avatar';
import { useSession, useToast } from '@/components/providers';

type Tab = 'received' | 'sent';

export default function RequestsPage() {
  const router = useRouter();
  const { push } = useToast();
  const { refresh } = useSession();
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
    <div>
      <h1 className="text-xl font-bold leading-tight">
        Requests
        <span className="hindi block font-normal text-ink-3">निवेदन</span>
      </h1>

      <div role="tablist" aria-label="Requests" className="mt-3 flex gap-1 rounded-xl bg-paper-deep p-1">
        {(
          [
            { key: 'received', en: 'Received', hi: 'आए हुए', icon: Inbox },
            { key: 'sent', en: 'Sent', hi: 'भेजे हुए', icon: Send },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cx(
              'tap flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[15px] font-bold transition-colors',
              tab === t.key ? 'bg-card text-stamp shadow-card' : 'text-ink-2',
            )}
          >
            <t.icon size={18} aria-hidden />
            <span className="flex flex-col items-start leading-tight">
              {t.en}
              <span className="hindi font-normal">{t.hi}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="pt-4">
        {error ? (
          <ErrorNote message={error} onRetry={load} />
        ) : rows === null ? (
          <RequestsSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={tab === 'received' ? <Inbox size={26} /> : <Send size={26} />}
            title={tab === 'received' ? 'No requests yet' : 'You have not sent any interest yet'}
            hindi={tab === 'received' ? 'अभी कोई निवेदन नहीं' : 'आपने अभी रुचि नहीं भेजी'}
            body={
              tab === 'received'
                ? 'When a family sends interest in your profile, it will appear here for you to accept or decline.'
                : 'Open the register, find a profile you like, and send an interest. It will show here until they answer.'
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
                <h2 className="mb-2 text-[15px] font-bold uppercase tracking-wide text-ink-2">
                  Needs your answer
                  <span className="hindi ml-2 font-normal normal-case tracking-normal text-ink-3">
                    उत्तर चाहिए
                  </span>
                </h2>
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
                <h2 className="mb-2 text-[15px] font-bold uppercase tracking-wide text-ink-2">
                  Answered
                  <span className="hindi ml-2 font-normal normal-case tracking-normal text-ink-3">
                    उत्तर मिल गया
                  </span>
                </h2>
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

      <p className="mt-6 flex items-start gap-2 border-t border-rule pt-4 text-sm text-ink-2">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-seal" aria-hidden />
        Accepting an interest opens family details only. Photos and numbers stay closed until you
        approve them separately.
      </p>
    </div>
  );
}

function acceptMessage(row: RequestView): string {
  const code = row.otherProfile.publicCode;
  if (row.request.type === 'interest') return `You are now connected with ${code}.`;
  if (row.request.type === 'photo') return `Photo shared with ${code} for 7 days.`;
  return `Your number is now with ${code}.`;
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
  const typeLabel = REQUEST_TYPE_LABELS[request.type];

  const acceptLabel =
    request.type === 'interest'
      ? ACTIONS.accept
      : request.type === 'photo'
        ? ACTIONS.sharePhoto
        : ACTIONS.shareContact;

  return (
    <Card as="li" className="p-3">
      <div className="flex gap-3">
        <GenderAvatar gender={p.gender} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/profile/${p.publicCode}`} className="code text-lg font-bold">
              {p.publicCode}
            </Link>
            <Stamp tone={stamp.tone}>{stamp.label}</Stamp>
            {request.type !== 'interest' ? (
              <Stamp tone="ink">{typeLabel.en} request</Stamp>
            ) : null}
          </div>
          <p className="mt-1 text-[15px] text-ink-2">
            {age} yrs · {formatHeightShort(p.heightCm)} · {p.education} · {p.city}
          </p>
          <p className="text-sm text-ink-3">
            {isIncoming ? 'Received' : 'Sent'} {timeAgo(request.createdAt)}
          </p>
          {request.message ? (
            <blockquote className="mt-2 border-l-4 border-rule-strong bg-paper px-3 py-2 text-[15px] italic">
              &ldquo;{request.message}&rdquo;
            </blockquote>
          ) : null}
        </div>
      </div>

      {request.status === 'pending' ? (
        <div className="mt-3 flex gap-2">
          {isIncoming ? (
            <>
              <Button variant="primary" fullWidth loading={busy} label={acceptLabel} onClick={onAccept} />
              <Button variant="danger" loading={busy} label={ACTIONS.decline} onClick={onDecline} />
            </>
          ) : (
            <Button
              variant="danger"
              fullWidth
              loading={busy}
              label={
                request.type === 'interest'
                  ? ACTIONS.withdrawInterest
                  : { en: 'Take back request', hi: 'निवेदन वापस लें' }
              }
              onClick={onWithdraw}
            />
          )}
        </div>
      ) : null}

      {request.status === 'declined' && !isIncoming ? (
        <p className="mt-2 text-sm font-medium text-oxide">
          You can send interest to this family again after 30 days from{' '}
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
        <li key={i} className="border border-rule bg-card p-3">
          <div className="flex gap-3">
            <Skeleton className="h-16 w-16" />
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

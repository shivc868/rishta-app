import Link from 'next/link';
import { Flag } from 'lucide-react';
import { ActionForm } from '@/components/admin/bits';
import { inputClass } from '@/components/admin/styles';
import { EmptyState, PageHeader, ReportBadge, SegmentedTabs, StatusBadge } from '@/components/admin/ui';
import { cx } from '@/lib/cx';
import { requireAdmin } from '@/lib/admin/session';
import { adminNameMap, getStats, listReports } from '@/lib/admin/queries';
import { timeAgo } from '@/lib/labels';
import type { ReportStatus } from '@/lib/admin/types';
import { resolveReportAction } from '@/app/admin/actions';

type Tab = ReportStatus | 'all';
const TAB_KEYS: Tab[] = ['open', 'resolved', 'dismissed', 'all'];

const DATE_FMT = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

export default async function ReportsPage({ searchParams }: PageProps<'/admin/reports'>) {
  await requireAdmin();
  const sp = await searchParams;
  const raw = typeof sp.status === 'string' ? sp.status : 'open';
  const status: Tab = (TAB_KEYS as string[]).includes(raw) ? (raw as Tab) : 'open';
  const [reports, names, stats] = await Promise.all([listReports(status), adminNameMap(), getStats()]);

  const tabs = [
    { key: 'open' as Tab, label: 'Open', count: stats?.open_reports },
    { key: 'resolved' as Tab, label: 'Resolved' },
    { key: 'dismissed' as Tab, label: 'Dismissed' },
    { key: 'all' as Tab, label: 'All' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Families flag a profile from its page. Resolve after you have acted, dismiss if nothing was wrong."
      />

      <SegmentedTabs tabs={tabs} active={status} href={(k) => `/admin/reports?status=${k}`} ariaLabel="Report status" />

      {reports.length === 0 ? (
        <EmptyState title="No reports in this view" icon={Flag}>
          {status === 'open' ? 'Nothing is waiting on you.' : 'Switch tabs to see other reports.'}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => {
            const tone = r.status === 'open' ? 'bg-oxide' : r.status === 'resolved' ? 'bg-seal' : 'bg-ink-3';
            return (
              <li key={r.id} className="relative overflow-hidden rounded-xl bg-card ring-1 ring-rule shadow-[var(--shadow-e1)]">
                <span aria-hidden className={cx('absolute inset-y-0 left-0 w-1', tone)} />
                <div className="grid gap-4 p-4 pl-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-2">
                      <ReportBadge status={r.status} />
                      <span>against</span>
                      <Link href={`/admin/profiles/${r.target_profile_id}`} className="code font-bold text-ink hover:text-stamp">
                        {r.target?.public_code ?? r.target_profile_id.slice(0, 8)}
                      </Link>
                      {r.target?.status && <StatusBadge status={r.target.status} />}
                      <span aria-hidden>·</span>
                      <span>
                        by <span className="code font-semibold text-ink">{r.reporter?.public_code ?? 'unknown'}</span>
                      </span>
                      <span aria-hidden>·</span>
                      <time dateTime={r.created_at} title={r.created_at}>
                        {DATE_FMT.format(new Date(r.created_at))}, {timeAgo(r.created_at)}
                      </time>
                    </div>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink">{r.reason}</p>
                    {r.status !== 'open' && (
                      <p className="mt-2 text-[12.5px] text-ink-2">
                        <span className="capitalize">{r.status}</span> by{' '}
                        <span className="font-semibold text-ink">{names.get(r.resolved_by ?? '') ?? 'an admin'}</span>
                        {r.resolved_at ? ` ${timeAgo(r.resolved_at)}` : ''}
                        {r.resolution_note ? <span className="italic"> — “{r.resolution_note}”</span> : ''}
                      </p>
                    )}
                  </div>

                  <div className="lg:border-l lg:border-rule lg:pl-4">
                    {r.status === 'open' ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <ActionForm action={resolveReportAction} fields={{ id: r.id, status: 'resolved' }} submitLabel="Resolve" variant="primary" size="sm">
                          <input name="note" placeholder="What was done" className={inputClass} />
                        </ActionForm>
                        <ActionForm action={resolveReportAction} fields={{ id: r.id, status: 'dismissed' }} submitLabel="Dismiss" size="sm">
                          <input name="note" placeholder="Why it was dismissed" className={inputClass} />
                        </ActionForm>
                      </div>
                    ) : (
                      <div className="flex h-full items-center lg:justify-end">
                        <ActionForm action={resolveReportAction} fields={{ id: r.id, status: 'open' }} submitLabel="Reopen" variant="quiet" size="sm" inline />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

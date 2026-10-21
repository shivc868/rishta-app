import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  Flag,
  Heart,
  MessageSquare,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  Avatar,
  BreakdownBar,
  EmptyState,
  PageHeader,
  Panel,
  PROFILE_STATUS_META,
  ReportBadge,
  StatTile,
  StatusBadge,
  Table,
  Td,
  Tr,
} from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin/session';
import { getStats, listProfiles, listReports } from '@/lib/admin/queries';
import { ageFromDob } from '@/lib/api';
import { RELIGION_LABELS, timeAgo } from '@/lib/labels';

const DATE_FMT = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  const [stats, pending, reports] = await Promise.all([
    getStats(),
    listProfiles({ status: 'pending_review', page: 1 }),
    listReports('open'),
  ]);

  const s = stats ?? {
    pending_review: 0,
    active: 0,
    paused: 0,
    matched: 0,
    verified: 0,
    accounts: 0,
    open_reports: 0,
    admins: 0,
    requests_7d: 0,
    signups_7d: 0,
  };
  const totalProfiles = s.pending_review + s.active + s.paused + s.matched;
  const verifiedPct = totalProfiles ? Math.round((s.verified / totalProfiles) * 100) : 0;
  const firstName = (admin.displayName || 'there').split(' ')[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={DATE_FMT.format(new Date())}
        title={`Good day, ${firstName}`}
        description={
          s.open_reports > 0
            ? `${s.active} live profile${s.active === 1 ? '' : 's'} and ${s.open_reports} open report${s.open_reports === 1 ? '' : 's'} to look at.`
            : `${s.active} live profile${s.active === 1 ? '' : 's'}. No open reports.`
        }
        actions={
          <Link
            href="/admin/profiles"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-inverse px-3.5 text-[13.5px] font-semibold text-white hover:brightness-110"
          >
            <ClipboardCheck size={15} aria-hidden /> Browse profiles
          </Link>
        }
      />

      {/* KPI row */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label="Live profiles"
          value={s.active}
          tone="seal"
          icon={BadgeCheck}
          hint={`${s.verified} carry the verified badge · ${verifiedPct}%`}
          href="/admin/profiles?status=active"
        />
        <StatTile
          label="Open reports"
          value={s.open_reports}
          tone={s.open_reports ? 'oxide' : 'ink'}
          icon={Flag}
          hint="Flagged by families"
          href="/admin/reports"
        />
        <StatTile
          label="Hidden for review"
          value={s.pending_review}
          tone={s.pending_review ? 'gold' : 'ink'}
          icon={ClipboardCheck}
          hint="Taken offline by an admin"
          href="/admin/profiles?status=pending_review"
        />
        <StatTile
          label="Accounts"
          value={s.accounts}
          icon={Users}
          hint={
            <span className="inline-flex items-center gap-1">
              <UserPlus size={13} aria-hidden className="text-seal" />
              <span className="font-semibold text-seal">+{s.signups_7d}</span> this week
            </span>
          }
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Register at a glance" description={`${totalProfiles} profiles in total`} className="lg:col-span-2">
          <BreakdownBar
            parts={[
              { label: PROFILE_STATUS_META.active.label, value: s.active, className: PROFILE_STATUS_META.active.bar },
              {
                label: PROFILE_STATUS_META.pending_review.label,
                value: s.pending_review,
                className: PROFILE_STATUS_META.pending_review.bar,
              },
              { label: PROFILE_STATUS_META.matched.label, value: s.matched, className: PROFILE_STATUS_META.matched.bar },
              { label: PROFILE_STATUS_META.paused.label, value: s.paused, className: PROFILE_STATUS_META.paused.bar },
            ]}
          />
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-rule pt-4 sm:grid-cols-4">
            <Mini icon={MessageSquare} label="Requests, 7 days" value={s.requests_7d} />
            <Mini icon={Heart} label="Matched" value={s.matched} />
            <Mini icon={BadgeCheck} label="Verified" value={s.verified} />
            <Mini icon={ShieldCheck} label="Admins" value={s.admins} />
          </dl>
        </Panel>

        <Panel title="Quick links">
          <ul className="-my-1 divide-y divide-rule text-[13.5px]">
            <QuickLink href="/admin/profiles?status=active" label="Live profiles" meta={`${s.active} live`} />
            <QuickLink href="/admin/reports" label="Open reports" meta={`${s.open_reports} open`} />
            <QuickLink href="/admin/profiles?status=paused" label="Paused profiles" meta={`${s.paused}`} />
            <QuickLink href="/admin/audit" label="Audit log" meta="Every action" />
            {admin.role === 'superadmin' && <QuickLink href="/admin/admins" label="Manage admins" meta={`${s.admins} people`} />}
          </ul>
        </Panel>
      </div>

      {(pending.rows.length > 0) && (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold">Hidden for review</h2>
          <Link
            href="/admin/profiles?status=pending_review"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-stamp hover:underline"
          >
            View all <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
        {pending.rows.length === 0 ? (
          <EmptyState title="Nothing is hidden" icon={ClipboardCheck}>
            Profiles go live as soon as a family submits them. Anything an admin sends back to review shows here.
          </EmptyState>
        ) : (
          <Table head={['Profile', 'Community', 'Place', 'Submitted', 'Status']}>
            {pending.rows.slice(0, 8).map((p) => (
              <Tr key={p.id}>
                <Td>
                  <Link href={`/admin/profiles/${p.id}`} className="group flex items-center gap-3">
                    <Avatar seed={p.public_code} size="sm" />
                    <span className="leading-tight">
                      <span className="code block font-bold text-ink group-hover:text-stamp">{p.public_code}</span>
                      <span className="block text-[12px] text-ink-3">
                        {p.gender === 'male' ? 'Groom' : 'Bride'} · {ageFromDob(p.dob)} yrs
                      </span>
                    </span>
                  </Link>
                </Td>
                <Td>
                  {RELIGION_LABELS[p.religion].en} · {p.community}
                </Td>
                <Td muted>
                  {p.city}, {p.district}
                </Td>
                <Td muted>{timeAgo(p.created_at)}</Td>
                <Td>
                  <StatusBadge status={p.status} />
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold">Open reports</h2>
          <Link href="/admin/reports" className="inline-flex items-center gap-1 text-[13px] font-semibold text-stamp hover:underline">
            View all <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
        {reports.length === 0 ? (
          <EmptyState title="No open reports" icon={Flag}>
            When a family flags a profile it shows up here.
          </EmptyState>
        ) : (
          <Table head={['Against', 'Reason', 'Filed', 'Status']}>
            {reports.slice(0, 8).map((r) => (
              <Tr key={r.id}>
                <Td>
                  <Link href={`/admin/profiles/${r.target_profile_id}`} className="code font-bold text-ink hover:text-stamp">
                    {r.target?.public_code ?? r.target_profile_id.slice(0, 8)}
                  </Link>
                </Td>
                <Td className="max-w-md truncate">{r.reason}</Td>
                <Td muted>{timeAgo(r.created_at)}</Td>
                <Td>
                  <ReportBadge status={r.status} />
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </section>
    </div>
  );
}

function Mini({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-paper-deep text-ink-2">
        <Icon size={15} aria-hidden />
      </span>
      <span className="leading-tight">
        <dd className="text-[16px] font-bold tabular-nums text-ink">{value.toLocaleString('en-IN')}</dd>
        <dt className="text-[11.5px] text-ink-3">{label}</dt>
      </span>
    </div>
  );
}

function QuickLink({ href, label, meta }: { href: string; label: string; meta: string }) {
  return (
    <li>
      <Link href={href} className="group flex items-center justify-between gap-3 py-2.5">
        <span className="font-medium text-ink group-hover:text-stamp">{label}</span>
        <span className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
          {meta}
          <ArrowRight size={13} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </li>
  );
}

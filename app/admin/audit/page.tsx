import Link from 'next/link';
import { ScrollText } from 'lucide-react';
import { Avatar, EmptyState, PageHeader, Pill, Table, Td, Tr, type PillTone } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin/session';
import { adminNameMap, listAuditLog } from '@/lib/admin/queries';
import { timeAgo } from '@/lib/labels';

const DATE_FMT = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

function describe(detail: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(detail)) {
    if (v === '' || v === null || v === undefined) continue;
    parts.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
  }
  return parts.join(' · ');
}

/** Colour the verb so a scan of the column shows destructive actions at once. */
function toneOf(action: string): PillTone {
  if (/delete|remove|dismiss/.test(action)) return 'oxide';
  if (/approve|verify|resolve|add|active/.test(action)) return 'seal';
  if (/pause|review/.test(action)) return 'gold';
  return 'ink';
}

export default async function AuditPage() {
  await requireAdmin();
  const [rows, names] = await Promise.all([listAuditLog(200), adminNameMap()]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit log"
        description="Every admin action, newest first. Rows are append-only; nobody can edit or delete them."
      />

      {rows.length === 0 ? (
        <EmptyState title="No actions recorded yet" icon={ScrollText}>
          Approvals, pauses, verifications and admin changes will appear here.
        </EmptyState>
      ) : (
        <Table
          head={[{ label: 'When', className: 'whitespace-nowrap' }, 'Admin', 'Action', 'Target', 'Detail']}
          footer={`Showing the latest ${rows.length} actions`}
        >
          {rows.map((r) => {
            const admin = names.get(r.admin_id) ?? r.admin_id.slice(0, 8);
            return (
              <Tr key={r.id}>
                <Td className="whitespace-nowrap">
                  <time dateTime={r.created_at} title={r.created_at} className="block leading-tight">
                    <span className="block text-ink">{DATE_FMT.format(new Date(r.created_at))}</span>
                    <span className="block text-[12px] text-ink-3">{timeAgo(r.created_at)}</span>
                  </time>
                </Td>
                <Td>
                  <span className="flex items-center gap-2">
                    <Avatar seed={r.admin_id} label={admin} size="sm" />
                    <span className="font-medium">{admin}</span>
                  </span>
                </Td>
                <Td>
                  <Pill tone={toneOf(r.action)} dot={false}>
                    <span className="code normal-case">{r.action}</span>
                  </Pill>
                </Td>
                <Td>
                  {r.target_type === 'profile' ? (
                    <Link href={`/admin/profiles/${r.target_id}`} className="code text-ink hover:text-stamp">
                      {r.target_id.slice(0, 8)}
                    </Link>
                  ) : (
                    <span className="code text-ink-2">
                      {r.target_type} {r.target_id.slice(0, 16)}
                    </span>
                  )}
                </Td>
                <Td muted className="max-w-md truncate" >
                  <span title={describe(r.detail)}>{describe(r.detail) || '—'}</span>
                </Td>
              </Tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}

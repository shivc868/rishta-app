import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { EmptyState, PageHeader } from '@/components/admin/ui';

export default function DeniedPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Super admin only" />
      <EmptyState
        title="You do not have access to this page"
        icon={ShieldAlert}
        action={
          <Link
            href="/admin"
            className="inline-flex h-9 items-center rounded-lg bg-inverse px-3.5 text-[13.5px] font-semibold text-white hover:brightness-110"
          >
            Back to the dashboard
          </Link>
        }
      >
        That page manages who can administer the register, so only a super admin may open it.
      </EmptyState>
    </div>
  );
}

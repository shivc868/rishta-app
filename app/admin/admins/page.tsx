import { UserPlus, Users } from 'lucide-react';
import { ActionForm } from '@/components/admin/bits';
import { inputClass } from '@/components/admin/styles';
import { Avatar, EmptyState, PageHeader, Panel, Pill, Table, Td, Tr } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin/session';
import { listAdmins } from '@/lib/admin/queries';
import { ROLE_LABELS } from '@/lib/admin/types';
import { timeAgo } from '@/lib/labels';
import { addAdminAction, removeAdminAction, setAdminRoleAction } from '@/app/admin/actions';

export default async function AdminsPage() {
  const me = await requireAdmin('superadmin');
  const admins = await listAdmins();
  const superadmins = admins.filter((a) => a.role === 'superadmin').length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admins"
        description={`${admins.length} people can open this console · ${superadmins} super admin${superadmins === 1 ? '' : 's'}. Super admins manage this list; admins review profiles and handle reports.`}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="order-2 lg:order-1">
          {admins.length === 0 ? (
            <EmptyState title="No admins yet" icon={Users} />
          ) : (
            <Table head={['Person', 'Signs in with', 'Role', 'Access', 'Added', { label: '', className: 'w-56' }]} minWidth={760}>
              {admins.map((a) => {
                const isMe = a.user_id === me.userId;
                const contact = a.phone ?? a.email ?? '';
                const name = a.display_name || contact;
                return (
                  <Tr key={a.id}>
                    <Td>
                      <span className="flex items-center gap-3">
                        <Avatar seed={a.id} label={name} size="md" />
                        <span className="leading-tight">
                          <span className="block font-semibold text-ink">
                            {a.display_name || <span className="font-normal text-ink-3">Unnamed</span>}
                            {isMe && <span className="ml-1.5 text-[11.5px] font-medium text-ink-3">(you)</span>}
                          </span>
                        </span>
                      </span>
                    </Td>
                    <Td>
                      <span className="code block text-ink">{contact}</span>
                      <span className="block text-[12px] text-ink-3">{a.phone ? 'WhatsApp OTP' : 'Google'}</span>
                    </Td>
                    <Td>
                      <Pill tone={a.role === 'superadmin' ? 'stamp' : 'ink'} dot={false}>
                        {ROLE_LABELS[a.role]}
                      </Pill>
                    </Td>
                    <Td>
                      {a.user_id ? (
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-seal">
                          <span className="h-1.5 w-1.5 rounded-full bg-seal" aria-hidden /> Linked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-3">
                          <span className="h-1.5 w-1.5 rounded-full bg-ink-3" aria-hidden /> Not signed in yet
                        </span>
                      )}
                    </Td>
                    <Td muted className="whitespace-nowrap">
                      {timeAgo(a.created_at)}
                    </Td>
                    <Td>
                      {isMe ? (
                        <span className="text-[12.5px] text-ink-3">Ask another super admin</span>
                      ) : (
                        <div className="flex flex-wrap justify-end gap-2">
                          <ActionForm
                            action={setAdminRoleAction}
                            fields={{ id: a.id, role: a.role === 'superadmin' ? 'admin' : 'superadmin' }}
                            submitLabel={a.role === 'superadmin' ? 'Make admin' : 'Make super admin'}
                            size="sm"
                            inline
                          />
                          <ActionForm action={removeAdminAction} fields={{ id: a.id }} submitLabel="Remove" variant="quiet" size="sm" inline />
                        </div>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </Table>
          )}
        </div>

        <div className="order-1 lg:order-2">
          <Panel title="Add an admin" description="They get access the first time they sign in" icon={UserPlus}>
            <ActionForm action={addAdminAction} submitLabel="Add admin" variant="primary" fullWidth>
              <label className="block text-[12.5px] font-semibold text-ink-2">
                Mobile number or Google email
                <input
                  name="contact"
                  type="text"
                  autoComplete="off"
                  placeholder="98765 43210 or name@gmail.com"
                  required
                  className={`${inputClass} mt-1`}
                />
              </label>
              <label className="block text-[12.5px] font-semibold text-ink-2">
                Name
                <input name="display_name" placeholder="Shown in the audit log" className={`${inputClass} mt-1`} />
              </label>
              <label className="block text-[12.5px] font-semibold text-ink-2">
                Role
                <select name="role" defaultValue="admin" className={`${inputClass} mt-1`}>
                  <option value="admin">Admin — review profiles, handle reports</option>
                  <option value="superadmin">Super admin — everything, including this list</option>
                </select>
              </label>
            </ActionForm>
          </Panel>
        </div>
      </div>
    </div>
  );
}

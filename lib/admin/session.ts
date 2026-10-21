import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import type { AdminRole, AdminSession, AdminUserRow } from './types';

/**
 * Resolve the signed-in admin for this request, or null when the visitor is
 * not an admin. Cached per request so the layout and page share one lookup.
 *
 * The proxy already bounced anonymous visitors to /login; this is the real
 * check, against the `admin_users` table, and it runs on every render.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('admin_users')
    .select('role, display_name, phone, email')
    .eq('user_id', user.id)
    .maybeSingle<Pick<AdminUserRow, 'role' | 'display_name' | 'phone' | 'email'>>();
  if (!data) return null;

  return {
    userId: user.id,
    phone: data.phone,
    email: data.email,
    role: data.role,
    displayName: data.display_name,
  };
});

/** Use at the top of any admin page or action. Redirects instead of returning null. */
export async function requireAdmin(minRole: AdminRole = 'admin'): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/denied');
  if (minRole === 'superadmin' && session.role !== 'superadmin') redirect('/admin/denied');
  return session;
}

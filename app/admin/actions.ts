'use server';

/**
 * Admin mutations. Each one: (1) re-checks the caller's role on the server,
 * (2) performs one write under the caller's RLS, (3) appends an audit row,
 * (4) revalidates the pages that show the change.
 *
 * They return `{ ok, message }` instead of throwing so the form components
 * can render the outcome inline.
 */

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/session';
import { supabaseServer } from '@/lib/supabase/server';
import type { ProfileStatus } from '@/types';
import type { AdminRole, ReportStatus } from '@/lib/admin/types';

export interface ActionResult {
  ok: boolean;
  message: string;
}

const PROFILE_STATUSES: ProfileStatus[] = ['pending_review', 'active', 'paused', 'matched'];
const REPORT_STATUSES: ReportStatus[] = ['open', 'resolved', 'dismissed'];
const ROLES: AdminRole[] = ['superadmin', 'admin'];

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

async function log(action: string, targetType: string, targetId: string, detail: Record<string, unknown> = {}) {
  const supabase = await supabaseServer();
  await supabase.rpc('admin_log', {
    p_action: action,
    p_target_type: targetType,
    p_target_id: targetId,
    p_detail: detail,
  });
}

// --- Profiles ---------------------------------------------------------------

export async function setProfileStatusAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = str(form, 'id');
  const status = str(form, 'status') as ProfileStatus;
  const note = str(form, 'note').slice(0, 500);
  if (!id || !PROFILE_STATUSES.includes(status)) return { ok: false, message: 'Bad request.' };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('profiles')
    .update({
      status,
      reviewed_by: admin.userId,
      reviewed_at: new Date().toISOString(),
      ...(note ? { review_note: note } : {}),
    })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };

  await log('profile.status', 'profile', id, { status, note });
  revalidatePath('/admin');
  revalidatePath('/admin/profiles');
  revalidatePath(`/admin/profiles/${id}`);
  return { ok: true, message: `Profile marked ${status.replace('_', ' ')}.` };
}

export async function setProfileVerifiedAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = str(form, 'id');
  const verified = str(form, 'verified') === 'true';
  if (!id) return { ok: false, message: 'Bad request.' };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('profiles')
    .update({ is_verified: verified, reviewed_by: admin.userId, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };

  await log(verified ? 'profile.verify' : 'profile.unverify', 'profile', id);
  revalidatePath('/admin/profiles');
  revalidatePath(`/admin/profiles/${id}`);
  return { ok: true, message: verified ? 'Profile marked verified.' : 'Verification removed.' };
}

export async function deleteProfileAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin('superadmin');
  const id = str(form, 'id');
  const confirm = str(form, 'confirm');
  if (!id) return { ok: false, message: 'Bad request.' };
  if (confirm !== 'DELETE') return { ok: false, message: 'Type DELETE to confirm.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };

  await log('profile.delete', 'profile', id);
  revalidatePath('/admin');
  revalidatePath('/admin/profiles');
  return { ok: true, message: 'Profile deleted.' };
}

// --- Reports ----------------------------------------------------------------

export async function resolveReportAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = str(form, 'id');
  const status = str(form, 'status') as ReportStatus;
  const note = str(form, 'note').slice(0, 500);
  if (!id || !REPORT_STATUSES.includes(status)) return { ok: false, message: 'Bad request.' };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('reports')
    .update({
      status,
      resolved_by: status === 'open' ? null : admin.userId,
      resolved_at: status === 'open' ? null : new Date().toISOString(),
      resolution_note: note,
    })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };

  await log(`report.${status}`, 'report', id, { note });
  revalidatePath('/admin');
  revalidatePath('/admin/reports');
  return { ok: true, message: `Report ${status}.` };
}

// --- Admins (superadmin only) ----------------------------------------------

export async function addAdminAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const admin = await requireAdmin('superadmin');
  const contact = str(form, 'contact').trim();
  const role = str(form, 'role') as AdminRole;
  const displayName = str(form, 'display_name').slice(0, 80);
  if (!ROLES.includes(role)) return { ok: false, message: 'Pick a role.' };

  // Either a 10-digit WhatsApp number or the Google email they sign in with.
  let phone: string | null = null;
  let email: string | null = null;
  if (contact.includes('@')) {
    email = contact.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: 'Enter a valid email.' };
  } else {
    const digits = contact.replace(/\D/g, '');
    if (digits.length < 10) return { ok: false, message: 'Enter a 10-digit mobile number or an email.' };
    phone = `+91${digits.slice(-10)}`;
  }
  const key = phone ?? email ?? '';

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('admin_users')
    .insert({ phone, email, role, display_name: displayName, created_by: admin.userId });
  if (error) {
    if (error.code === '23505') return { ok: false, message: 'That person is already an admin.' };
    return { ok: false, message: error.message };
  }

  await log('admin.add', 'admin_user', key, { role, displayName });
  revalidatePath('/admin/admins');
  return {
    ok: true,
    message: `${displayName || key} added as ${role}. They can open /admin after signing in with ${
      phone ? 'that number' : 'that Google account'
    }.`,
  };
}

export async function setAdminRoleAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const admin = await requireAdmin('superadmin');
  const id = str(form, 'id');
  const role = str(form, 'role') as AdminRole;
  if (!id || !ROLES.includes(role)) return { ok: false, message: 'Bad request.' };

  const supabase = await supabaseServer();
  const { data: target } = await supabase.from('admin_users').select('user_id').eq('id', id).maybeSingle();
  if (target?.user_id === admin.userId) return { ok: false, message: 'You cannot change your own role.' };

  const { error } = await supabase.from('admin_users').update({ role }).eq('id', id);
  if (error) return { ok: false, message: error.message };

  await log('admin.role', 'admin_user', id, { role });
  revalidatePath('/admin/admins');
  return { ok: true, message: `Role changed to ${role}.` };
}

export async function removeAdminAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const admin = await requireAdmin('superadmin');
  const id = str(form, 'id');
  if (!id) return { ok: false, message: 'Bad request.' };

  const supabase = await supabaseServer();
  const { data: target } = await supabase.from('admin_users').select('user_id, phone').eq('id', id).maybeSingle();
  if (target?.user_id === admin.userId) return { ok: false, message: 'You cannot remove yourself.' };

  const { error } = await supabase.from('admin_users').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };

  await log('admin.remove', 'admin_user', id, { phone: target?.phone });
  revalidatePath('/admin/admins');
  return { ok: true, message: 'Admin removed.' };
}

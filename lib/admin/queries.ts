import 'server-only';

import { supabaseServer } from '@/lib/supabase/server';
import type { Gender, MaritalStatus, ProfileStatus, Religion } from '@/types';
import type {
  AdminActionRow,
  AdminStats,
  AdminUserRow,
  ProfilePrivateRow,
  ProfileRow,
  ReportRow,
  ReportStatus,
} from './types';

/** Reads for the admin panel. Every query runs under the admin's own RLS. */

export const PAGE_SIZE = 25;

export async function getStats(): Promise<AdminStats | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('admin_stats');
  if (error) throw new Error(error.message);
  return (data as AdminStats | null) ?? null;
}

export type ProfileSort = 'newest' | 'oldest' | 'recently_active' | 'age_asc' | 'age_desc';

export interface ProfileListQuery {
  status?: ProfileStatus | 'all';
  q?: string;
  page?: number;
  gender?: Gender | '';
  religion?: Religion | '';
  marital?: MaritalStatus | '';
  state?: string;
  district?: string;
  /** Inclusive age bounds in years; either may be omitted. */
  ageMin?: number;
  ageMax?: number;
  verified?: 'yes' | 'no' | '';
  /** Created within the last N days. */
  createdWithin?: number;
  sort?: ProfileSort;
}

/** Date `years` ago, as YYYY-MM-DD, for turning an age bound into a DOB bound. */
function dobYearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

export async function listProfiles(query: ProfileListQuery): Promise<{ rows: ProfileRow[]; total: number }> {
  const supabase = await supabaseServer();
  const page = Math.max(1, query.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;

  let q = supabase.from('profiles').select('*', { count: 'exact' });

  if (query.status && query.status !== 'all') q = q.eq('status', query.status);
  if (query.gender) q = q.eq('gender', query.gender);
  if (query.religion) q = q.eq('religion', query.religion);
  if (query.marital) q = q.eq('marital_status', query.marital);
  if (query.state) q = q.eq('state', query.state);
  if (query.district) q = q.eq('district', query.district);
  if (query.verified === 'yes') q = q.eq('is_verified', true);
  if (query.verified === 'no') q = q.eq('is_verified', false);
  // Someone aged >= ageMin was born on or before (today - ageMin years);
  // aged <= ageMax was born after (today - (ageMax + 1) years).
  if (query.ageMin) q = q.lte('dob', dobYearsAgo(query.ageMin));
  if (query.ageMax) q = q.gt('dob', dobYearsAgo(query.ageMax + 1));
  if (query.createdWithin) {
    q = q.gte('created_at', new Date(Date.now() - query.createdWithin * 86_400_000).toISOString());
  }
  if (query.q) {
    const term = query.q.trim().replace(/[%,()]/g, '');
    if (term) {
      q = q.or(
        `public_code.ilike.%${term}%,city.ilike.%${term}%,district.ilike.%${term}%,community.ilike.%${term}%,occupation.ilike.%${term}%,education.ilike.%${term}%`,
      );
    }
  }

  switch (query.sort ?? 'newest') {
    case 'oldest':
      q = q.order('created_at', { ascending: true });
      break;
    case 'recently_active':
      q = q.order('last_active_at', { ascending: false });
      break;
    case 'age_asc':
      q = q.order('dob', { ascending: false });
      break;
    case 'age_desc':
      q = q.order('dob', { ascending: true });
      break;
    default:
      q = q.order('created_at', { ascending: false });
  }

  const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as ProfileRow[], total: count ?? 0 };
}

/** Distinct state -> districts present in the register, for the filter selects. */
export async function listPlaces(): Promise<Record<string, string[]>> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('profiles').select('state, district').limit(5000);
  if (error) throw new Error(error.message);
  const out: Record<string, Set<string>> = {};
  for (const row of (data ?? []) as Array<{ state: string; district: string }>) {
    (out[row.state] ??= new Set()).add(row.district);
  }
  return Object.fromEntries(
    Object.keys(out)
      .sort()
      .map((st) => [st, [...out[st]].sort()]),
  );
}

export async function getProfileForReview(
  id: string,
): Promise<{ profile: ProfileRow; priv: ProfilePrivateRow | null; reports: ReportRow[] } | null> {
  const supabase = await supabaseServer();
  const [{ data: profile }, { data: priv }, { data: reports }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).maybeSingle<ProfileRow>(),
    supabase.from('profile_privates').select('*').eq('profile_id', id).maybeSingle<ProfilePrivateRow>(),
    supabase
      .from('reports')
      .select('*, reporter:profiles!reports_reporter_profile_id_fkey(public_code)')
      .eq('target_profile_id', id)
      .order('created_at', { ascending: false }),
  ]);
  if (!profile) return null;
  return { profile, priv: priv ?? null, reports: (reports ?? []) as ReportRow[] };
}

export async function listReports(status: ReportStatus | 'all'): Promise<ReportRow[]> {
  const supabase = await supabaseServer();
  let q = supabase
    .from('reports')
    .select(
      '*, target:profiles!reports_target_profile_id_fkey(public_code, status), reporter:profiles!reports_reporter_profile_id_fkey(public_code)',
    )
    .order('created_at', { ascending: false })
    .limit(100);
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as ReportRow[];
}

export async function listAdmins(): Promise<AdminUserRow[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .order('role', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminUserRow[];
}

export async function listAuditLog(limit = 100): Promise<AdminActionRow[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('admin_actions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminActionRow[];
}

/** Map admin user ids to display names, for the audit log and review stamps. */
export async function adminNameMap(): Promise<Map<string, string>> {
  const admins = await listAdmins();
  const map = new Map<string, string>();
  for (const a of admins) {
    if (a.user_id) map.set(a.user_id, a.display_name || a.phone || a.email || a.user_id);
  }
  return map;
}

/**
 * Row shapes the admin panel reads straight from Supabase (snake_case, as
 * stored). The register screens use the camelCase types in types/index.ts;
 * the admin panel deliberately works on raw rows so it can show moderation
 * columns (reviewed_by, review_note) that never reach the public app.
 */

import type {
  Complexion,
  CreatedFor,
  Diet,
  EducationLevel,
  Gender,
  IncomeBand,
  Manglik,
  MaritalStatus,
  OccupationCategory,
  ProfileStatus,
  Religion,
  SocialCategory,
} from '@/types';

export type AdminRole = 'superadmin' | 'admin';

export interface AdminUserRow {
  id: string;
  /** WhatsApp number, or null for an admin added by Google email. */
  phone: string | null;
  email: string | null;
  user_id: string | null;
  role: AdminRole;
  display_name: string;
  created_by: string | null;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  account_id: string;
  public_code: string;
  created_for: CreatedFor;
  gender: Gender;
  dob: string;
  height_cm: number;
  weight_band: string;
  complexion: Complexion;
  education: string;
  education_level: EducationLevel;
  occupation: string;
  occupation_category: OccupationCategory;
  income_band: IncomeBand;
  religion: Religion;
  category: SocialCategory;
  community: string;
  state: string;
  district: string;
  city: string;
  village: string;
  marital_status: MaritalStatus;
  diet: Diet;
  manglik: Manglik;
  about: string;
  family_brief: string;
  status: ProfileStatus;
  /** Generated demo row — see migrations/0003_seed_flag.sql. */
  is_seed: boolean;
  is_verified: boolean;
  created_at: string;
  last_active_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string;
}

export interface ProfilePrivateRow {
  profile_id: string;
  full_name: string;
  phone: string;
  photo_urls: string[];
  family_details: string;
  exact_address: string;
}

export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export interface ReportRow {
  id: string;
  reporter_profile_id: string | null;
  target_profile_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string;
  /** Joined for the list view. */
  target?: Pick<ProfileRow, 'public_code' | 'status'> | null;
  reporter?: Pick<ProfileRow, 'public_code'> | null;
}

export interface AdminActionRow {
  id: number;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface AdminStats {
  pending_review: number;
  active: number;
  paused: number;
  matched: number;
  verified: number;
  accounts: number;
  open_reports: number;
  admins: number;
  requests_7d: number;
  signups_7d: number;
}

/** Who is using the panel right now. Attached to every page by the layout. */
export interface AdminSession {
  userId: string;
  phone: string | null;
  email: string | null;
  role: AdminRole;
  displayName: string;
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  superadmin: 'Super admin',
  admin: 'Admin',
};

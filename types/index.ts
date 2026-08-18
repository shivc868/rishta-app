/**
 * Domain types for the rishta app.
 *
 * These mirror a future Postgres schema 1:1 — every interface here is a table,
 * every union is a CHECK constraint or enum type. Field names are camelCase in
 * TS and would map to snake_case columns via a Supabase codegen layer.
 *
 * The split between `Profile` and `ProfilePrivate` is the whole product:
 * `Profile` is what Row Level Security would let anyone read; `ProfilePrivate`
 * is what RLS would gate behind an active `Grant`. Nothing in `Profile` may
 * ever identify a person.
 */

export type Gender = 'male' | 'female';

export type ProfileStatus = 'pending_review' | 'active' | 'paused' | 'matched';

export type RequestType = 'interest' | 'photo' | 'contact';

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export type GrantScope = 'photo' | 'contact';

export type MaritalStatus = 'never_married' | 'divorced' | 'widowed' | 'annulled';

export type Diet = 'vegetarian' | 'eggetarian' | 'non_vegetarian' | 'jain_vegetarian';

export type Manglik = 'yes' | 'no' | 'partial' | 'unknown';

/**
 * Monthly income, in coarse bands only — never an exact number. Families here
 * talk in "kitna mahina" (per month), not annual CTC.
 *
 * The ladder steps by ₹10,000 from ₹15,000 up to ₹1 lakh. Two bands are not
 * 10k wide, on purpose: `upto_15k` is the floor, so a student or a homemaker
 * has something true to pick now that there is no "not disclosed" option, and
 * `85k_1l` is 15k wide because 15,000 + 10,000n never lands exactly on a lakh
 * and ₹1 lakh has to stay the boundary families recognise.
 *
 * Ordered low to high for range filtering.
 */
export type IncomeBand =
  | 'upto_15k'
  | '15k_25k'
  | '25k_35k'
  | '35k_45k'
  | '45k_55k'
  | '55k_65k'
  | '65k_75k'
  | '75k_85k'
  | '85k_1l'
  | 'above_1l';

/** Grouping used by the education filter; the free-text degree lives on the profile. */
export type EducationLevel =
  | 'high_school'
  | 'diploma'
  | 'bachelors'
  | 'masters'
  | 'doctorate'
  | 'professional';

/**
 * Job type — the filter grouping. Kept to six plain options a parent can pick
 * from without reading carefully; the specific job ("Government school
 * teacher") lives in `Profile.occupation` as free text.
 */
export type OccupationCategory =
  | 'government'
  | 'private_job'
  | 'business'
  | 'self_employed'
  | 'student'
  | 'not_working';

/** Religion — asked before jati, the way families actually sort matches. */
export type Religion =
  | 'hindu'
  | 'muslim'
  | 'sikh'
  | 'christian'
  | 'jain'
  | 'buddhist'
  | 'other';

/** Who the account holder is filling the biodata for. Most users are parents. */
export type CreatedFor = 'self' | 'son' | 'daughter' | 'brother' | 'sister' | 'relative';

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/**
 * Publicly readable profile. Everything here appears on browse cards and on
 * unconnected profile pages. Adding a name, photo, phone, or exact address to
 * this interface is a privacy bug, not a feature.
 */
export interface Profile {
  id: string;
  /** Human-quotable identity used everywhere in the UI, e.g. "RSH-104". */
  publicCode: string;
  gender: Gender;
  /** ISO date. Age is derived, never stored, so it cannot drift. */
  dob: string;
  heightCm: number;
  /** 3-kg band as "54-57" (last band "138-140"). Coarse on purpose, like income. */
  weightBand: string;
  /** Free text as written on the biodata sheet, e.g. "M.A. Hindi". */
  education: string;
  educationLevel: EducationLevel;
  /** Free text, e.g. "Government school teacher". */
  occupation: string;
  occupationCategory: OccupationCategory;
  incomeBand: IncomeBand;
  religion: Religion;
  /** Jati / caste, from the per-religion list or typed via "Other". */
  community: string;
  /** Indian state / UT → district → tehsil, from the official hierarchy. */
  state: string;
  district: string;
  /** Tehsil / block town name. Kept in the `city` column — it is the town
      shown on cards and the anchor for the radius filter. */
  city: string;
  /** Optional village / mohalla, free text. Shown on the detail page, never on
      browse cards — and it is NOT the exact address, which stays gated. */
  village: string;
  /** Town-centre coordinates, captured when the city is picked (Places-shaped).
      The radius filter computes viewer→profile distance from these. */
  cityLat: number;
  cityLng: number;
  maritalStatus: MaritalStatus;
  diet: Diet;
  manglik: Manglik;
  /** Self-description. Moderated to contain no names or numbers. */
  about: string;
  /** Non-identifying family sketch, e.g. "Father retired from bank." */
  familyBrief: string;
  status: ProfileStatus;
  isVerified: boolean;
  createdAt: string;
  /** Drives the "recently active" sort and the "active 2 days ago" chip. */
  lastActiveAt: string;
}

/**
 * Gated columns. In Postgres this is a separate table with RLS that joins
 * against `grants`. The mock API must never return this whole row to anyone
 * except the owner — callers get scope-filtered views instead.
 */
export interface ProfilePrivate {
  profileId: string;
  fullName: string;
  phone: string;
  /** Placeholder gradient tokens in the mock, real storage URLs later. */
  photoUrls: string[];
  familyDetails: string;
  exactAddress: string;
}

export interface Request {
  id: string;
  fromProfileId: string;
  toProfileId: string;
  type: RequestType;
  status: RequestStatus;
  /** Max 200 chars, enforced by the API layer. */
  message: string;
  createdAt: string;
  respondedAt: string | null;
}

/**
 * A one-directional permission: `granteeProfileId` may see `scope` data
 * belonging to `targetProfileId`. Contact reveal requires two of these,
 * pointing opposite ways.
 */
export interface Grant {
  id: string;
  granteeProfileId: string;
  targetProfileId: string;
  scope: GrantScope;
  grantedAt: string;
  /** Photo grants expire in 7 days; contact grants do not expire. */
  expiresAt: string | null;
  revokedAt: string | null;
}

export interface Shortlist {
  id: string;
  ownerProfileId: string;
  targetProfileId: string;
  /** Private note, visible only to the owner. */
  note: string;
  createdAt: string;
}

/** One phone number = one account, which may own several profiles. */
export interface Account {
  id: string;
  phone: string;
  createdAt: string;
  ownedProfileIds: string[];
}

// ---------------------------------------------------------------------------
// Derived view models — computed by lib/api.ts, never stored
// ---------------------------------------------------------------------------

/**
 * The connection state machine, as seen from the viewer's side.
 *
 *   browsing -> interest_sent | interest_received -> connected
 *   connected -> (photo grants) -> (mutual contact grants)
 *
 * `stage` is the furthest point reached; photo/contact unlocks are tracked
 * separately because they are independent of each other and are per-direction.
 */
export type ConnectionStage =
  | 'browsing'
  | 'interest_sent'
  | 'interest_received'
  | 'connected'
  | 'declined_by_them'
  | 'declined_by_me';

export interface ConnectionState {
  otherProfileId: string;
  stage: ConnectionStage;
  /** The pending or resolved interest request, if any. */
  interest: Request | null;
  /** Viewer may see the other side's photos. */
  canSeePhotos: boolean;
  /** Other side may see the viewer's photos. */
  theyCanSeeMyPhotos: boolean;
  photoGrantToThem: Grant | null;
  photoGrantToMe: Grant | null;
  /** Viewer approved sharing their own number. */
  iSharedContact: boolean;
  /** Other side approved sharing their number. */
  theySharedContact: boolean;
  /** True only when both of the above are true — the mutual-consent gate. */
  canSeeContact: boolean;
  /** Open requests keyed by type, so buttons never offer a duplicate. */
  pendingOutgoing: Partial<Record<RequestType, Request>>;
  pendingIncoming: Partial<Record<RequestType, Request>>;
  /** ISO date until which the viewer cannot re-request after a decline. */
  cooldownUntil: string | null;
  isShortlisted: boolean;
}

/**
 * What a component actually renders. `private` is present only for the fields
 * the viewer has earned; absent keys mean "still locked", never "empty".
 */
export interface ProfileView {
  profile: Profile;
  connection: ConnectionState;
  /** Age in years, derived from dob. */
  age: number;
  /** Km from the viewer's own city to this profile's city. */
  distanceKm: number;
  revealed: {
    fullName?: string;
    /** Always present; masked as "+91 98••• •••10" until contact is unlocked. */
    phoneMasked: string;
    phone?: string;
    photoUrls?: string[];
    familyDetails?: string;
    exactAddress?: string;
  };
}

export interface BrowseCard {
  profile: Profile;
  age: number;
  /** Km from the viewer's own city to this profile's city. */
  distanceKm: number;
  isShortlisted: boolean;
  stage: ConnectionStage;
}

// ---------------------------------------------------------------------------
// Filters & queries
// ---------------------------------------------------------------------------

export type SortOrder = 'newest' | 'recently_active';

/** Every field optional — the browse page serialises this to URL search params. */
export interface ProfileFilters {
  ageMin?: number;
  ageMax?: number;
  heightMinCm?: number;
  heightMaxCm?: number;
  maritalStatus?: MaritalStatus[];
  educationLevel?: EducationLevel[];
  occupationCategory?: OccupationCategory[];
  incomeBand?: IncomeBand[];
  religion?: Religion[];
  community?: string[];
  /** Location cascade — each level narrows the next, like the wizard. */
  state?: string;
  district?: string;
  /** Tehsil town (the `city` column). */
  city?: string;
  maxDistanceKm?: number;
  manglik?: Manglik[];
  verifiedOnly?: boolean;
  sort?: SortOrder;
}

export interface Paginated<T> {
  items: T[];
  total: number;
}

/** Requests joined with the counterpart's public profile, for the inbox lists. */
export interface RequestView {
  request: Request;
  otherProfile: Profile;
  age: number;
  /** True when the viewer is the recipient. */
  isIncoming: boolean;
}

export interface ConnectionSummary {
  profile: Profile;
  age: number;
  connection: ConnectionState;
  connectedAt: string;
}

export interface ShortlistView {
  shortlist: Shortlist;
  profile: Profile;
  age: number;
  stage: ConnectionStage;
}

/** A grant the viewer has given away — rendered in settings with a Revoke button. */
export interface OutgoingGrantView {
  grant: Grant;
  granteeCode: string;
  /** null for contact grants, which do not expire. */
  expiresInDays: number | null;
}

export interface Session {
  accountId: string | null;
  phone: string | null;
  /** Which of the account's profiles is currently being acted as. */
  activeProfileId: string | null;
}

/** Errors thrown by lib/api.ts carry a code so the UI can write a real fix message. */
export type ApiErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'NO_ACTIVE_PROFILE'
  | 'PROFILE_NOT_FOUND'
  | 'NOT_CONNECTED'
  | 'DUPLICATE_REQUEST'
  | 'COOLDOWN_ACTIVE'
  | 'MESSAGE_TOO_LONG'
  | 'SAME_GENDER'
  | 'FORBIDDEN'
  | 'REQUEST_NOT_FOUND';

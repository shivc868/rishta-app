/**
 * The data seam.
 *
 * Every function is async and returns a Promise even though it currently reads
 * synchronously from Zustand. When Supabase lands, the body of each function is
 * replaced with a query and nothing else in the app changes.
 *
 * Two things live here and nowhere else:
 *   1. The privacy rules. Gender filtering, photo/phone gating and the mutual
 *      contact-consent check are enforced here, in the data layer — not by
 *      hiding UI. A component that renders whatever the API hands it cannot
 *      leak, because the API never hands it a locked field.
 *   2. The connection state machine. Components read `ConnectionState` and
 *      render buttons for the current stage; they never compute the stage.
 */

import { db } from './store';
import { haversineKm } from './cities';
import type {
  Complexion,
  BrowseCard,
  Religion,
  SocialCategory,
  ConnectionStage,
  ConnectionState,
  ConnectionSummary,
  CreatedFor,
  Diet,
  EducationLevel,
  Gender,
  Grant,
  IncomeBand,
  Manglik,
  MaritalStatus,
  OccupationCategory,
  OutgoingGrantView,
  Paginated,
  PartnerPreferences,
  Profile,
  ProfileFilters,
  ProfileStatus,
  ProfileView,
  Request,
  RequestType,
  RequestView,
  Session,
  ShortlistView,
  ApiErrorCode,
} from '@/types';

// ---------------------------------------------------------------------------
// Plumbing
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Fake network latency, so loading skeletons are real and not decorative. */
const LATENCY_MS = 220;
const delay = (ms = LATENCY_MS) => new Promise((r) => setTimeout(r, ms));

const PHOTO_GRANT_DAYS = 7;
const DECLINE_COOLDOWN_DAYS = 30;
const MAX_MESSAGE_LENGTH = 200;
const DAY = 86_400_000;

const nowIso = () => new Date().toISOString();

export function ageFromDob(dob: string): number {
  const b = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

/** "+919876543210" -> "+91 98••• •••10". Never reversible from the mask. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (digits.length < 10) return '+91 •••• ••••••';
  return `+91 ${digits.slice(0, 2)}••• •••${digits.slice(-2)}`;
}

function isGrantActive(g: Grant, at = Date.now()): boolean {
  if (g.revokedAt) return false;
  if (g.expiresAt && new Date(g.expiresAt).getTime() <= at) return false;
  return true;
}

function requireSession(): Session & { accountId: string } {
  const { session } = db();
  if (!session.accountId) {
    throw new ApiError('NOT_AUTHENTICATED', 'Please sign in with your phone number first.');
  }
  return session as Session & { accountId: string };
}

function requireActiveProfile(): Profile {
  const session = requireSession();
  const profile = db().profiles.find((p) => p.id === session.activeProfileId);
  if (!profile) {
    throw new ApiError(
      'NO_ACTIVE_PROFILE',
      'Choose which profile you are browsing for before continuing.',
    );
  }
  return profile;
}

function getProfileById(id: string): Profile {
  const p = db().profiles.find((x) => x.id === id);
  if (!p) throw new ApiError('PROFILE_NOT_FOUND', 'This profile is no longer available.');
  return p;
}

function resolveCode(code: string): Profile {
  const p = db().profiles.find(
    (x) => x.publicCode.toLowerCase() === code.toLowerCase() || x.id === code,
  );
  if (!p) {
    throw new ApiError(
      'PROFILE_NOT_FOUND',
      `No profile with code ${code}. Check the code and try again.`,
    );
  }
  return p;
}

// ---------------------------------------------------------------------------
// Auth (faked — any 6 digits pass)
// ---------------------------------------------------------------------------

export async function sendOtp(phone: string): Promise<{ sent: true; hint: string }> {
  await delay(400);
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) {
    throw new ApiError(
      'NOT_AUTHENTICATED',
      'Enter all 10 digits of your mobile number, without the country code.',
    );
  }
  return { sent: true, hint: 'Demo: enter any 6 digits' };
}

export async function verifyOtp(phone: string, code: string): Promise<Session> {
  await delay(400);
  if (!/^\d{6}$/.test(code)) {
    throw new ApiError('NOT_AUTHENTICATED', 'The code is 6 digits. Enter all six and try again.');
  }
  return signInAsAccount(`+91${phone.replace(/\D/g, '').slice(-10)}`);
}

/**
 * Google sign-in (faked). Accounts are keyed by phone, so a Google account is
 * stored under a `google:<email>` key until the register moves to Supabase.
 */
export async function signInWithGoogle(email: string): Promise<Session> {
  await delay(400);
  return signInAsAccount(`google:${email.trim().toLowerCase()}`);
}

/** Finds or creates the account behind `key` and opens a session for it. */
function signInAsAccount(key: string): Session {
  const store = db();
  let account = store.accounts.find((a) => a.phone === key);
  if (!account) {
    account = {
      id: store.takeId('acc-'),
      phone: key,
      createdAt: nowIso(),
      ownedProfileIds: [],
    };
    store.upsertAccount(account);
  }
  const session: Session = {
    accountId: account.id,
    phone: account.phone,
    activeProfileId: account.ownedProfileIds[0] ?? null,
  };
  db().setSession(session);
  return session;
}

export async function signOut(): Promise<void> {
  await delay(80);
  db().setSession({ accountId: null, phone: null, activeProfileId: null });
}

export async function getSession(): Promise<Session> {
  await delay(0);
  return db().session;
}

/** Profiles this account owns — the profile switcher reads this. */
export async function getMyProfiles(): Promise<Profile[]> {
  await delay(60);
  const session = requireSession();
  const account = db().accounts.find((a) => a.id === session.accountId);
  if (!account) return [];
  return account.ownedProfileIds
    .map((id) => db().profiles.find((p) => p.id === id))
    .filter((p): p is Profile => Boolean(p));
}

export async function getActiveProfile(): Promise<Profile | null> {
  await delay(0);
  const { session, profiles } = db();
  return profiles.find((p) => p.id === session.activeProfileId) ?? null;
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export interface ProfileDraft {
  createdFor: CreatedFor;
  gender: Gender;
  dob: string;
  heightCm: number;
  weightBand: string;
  complexion: Complexion;
  education: string;
  educationLevel: EducationLevel;
  occupation: string;
  occupationCategory: OccupationCategory;
  incomeBand: IncomeBand;
  religion: Religion;
  category: SocialCategory;
  community: string;
  state: string;
  district: string;
  city: string;
  village: string;
  cityLat: number;
  cityLng: number;
  maritalStatus: MaritalStatus;
  diet: Diet;
  manglik: Manglik;
  about: string;
  familyBrief: string;
}

/** Creates the profile live in the register. Returns the new public code. */
export async function createProfile(draft: ProfileDraft): Promise<Profile> {
  await delay(600);
  const session = requireSession();
  const store = db();
  // One account holds exactly one biodata. A second wizard run is a mistake,
  // not a feature — edits happen in Settings instead.
  const owner = store.accounts.find((a) => a.id === session.accountId);
  if (owner && owner.ownedProfileIds.length > 0) {
    throw new ApiError('FORBIDDEN', 'This account already holds a biodata. Edit it from Settings.');
  }
  const id = store.takeId('p-');
  const nextCode = 100 + store.profiles.length + 1;

  const profile: Profile = {
    id,
    publicCode: `RSH-${nextCode}`,
    gender: draft.gender,
    dob: draft.dob,
    heightCm: draft.heightCm,
    weightBand: draft.weightBand,
    complexion: draft.complexion,
    education: draft.education,
    educationLevel: draft.educationLevel,
    occupation: draft.occupation,
    occupationCategory: draft.occupationCategory,
    incomeBand: draft.incomeBand,
    religion: draft.religion,
    category: draft.category,
    community: draft.community,
    state: draft.state,
    district: draft.district,
    city: draft.city,
    village: draft.village,
    cityLat: draft.cityLat,
    cityLng: draft.cityLng,
    maritalStatus: draft.maritalStatus,
    diet: draft.diet,
    manglik: draft.manglik,
    about: draft.about,
    familyBrief: draft.familyBrief,
    status: 'active',
    isVerified: false,
    isSeed: false,
    createdAt: nowIso(),
    lastActiveAt: nowIso(),
  };

  // No private page in the wizard any more: the contact number is the account's
  // own login number, and everything else starts empty until the family adds it
  // later (a future "edit profile" screen — or the office, on paper).
  const accountPhone =
    store.accounts.find((a) => a.id === session.accountId)?.phone ?? session.phone ?? '';
  store.insertProfile(
    profile,
    {
      profileId: id,
      fullName: '',
      phone: accountPhone,
      photoUrls: [],
      familyDetails: '',
      exactAddress: '',
    },
    session.accountId,
  );

  db().setSession({ ...db().session, activeProfileId: id });
  return profile;
}

// ---------------------------------------------------------------------------
// Connection state machine
// ---------------------------------------------------------------------------

function buildConnectionState(viewerId: string, otherId: string): ConnectionState {
  const store = db();
  const at = Date.now();

  const between = store.requests.filter(
    (r) =>
      r.type === 'contact' &&
      ((r.fromProfileId === viewerId && r.toProfileId === otherId) ||
        (r.fromProfileId === otherId && r.toProfileId === viewerId)),
  );

  const activeGrants = store.grants.filter((g) => g.scope === 'contact' && isGrantActive(g, at));
  const contactToMe =
    activeGrants.find((g) => g.granteeProfileId === viewerId && g.targetProfileId === otherId) ?? null;
  const contactToThem =
    activeGrants.find((g) => g.granteeProfileId === otherId && g.targetProfileId === viewerId) ?? null;

  const pendingOutgoing: ConnectionState['pendingOutgoing'] = {};
  const pendingIncoming: ConnectionState['pendingIncoming'] = {};
  for (const r of between) {
    if (r.status !== 'pending') continue;
    if (r.fromProfileId === viewerId) pendingOutgoing[r.type] = r;
    else pendingIncoming[r.type] = r;
  }

  // The viewer's own asks, newest first — what the stage is judged on.
  const mine = between
    .filter((r) => r.fromProfileId === viewerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const lastDeclined = mine.find((r) => r.status === 'declined') ?? null;

  let stage: ConnectionStage = 'browsing';
  let request: Request | null = null;
  if (contactToMe) {
    stage = 'number_shared';
    request = mine.find((r) => r.status === 'accepted') ?? null;
  } else if (pendingOutgoing.contact) {
    stage = 'request_sent';
    request = pendingOutgoing.contact;
  } else if (pendingIncoming.contact) {
    stage = 'request_received';
    request = pendingIncoming.contact;
  } else if (lastDeclined) {
    stage = 'declined_by_them';
    request = lastDeclined;
  } else {
    const theirsDeclined = between.find(
      (r) => r.toProfileId === viewerId && r.status === 'declined',
    );
    if (theirsDeclined) {
      stage = 'declined_by_me';
      request = theirsDeclined;
    }
  }

  // Cooldown applies only to the side that was turned down.
  let cooldownUntil: string | null = null;
  if (lastDeclined?.respondedAt && !contactToMe) {
    const until = new Date(lastDeclined.respondedAt).getTime() + DECLINE_COOLDOWN_DAYS * DAY;
    if (until > at) cooldownUntil = new Date(until).toISOString();
  }

  const theySharedContact = Boolean(contactToMe);

  return {
    otherProfileId: otherId,
    stage,
    request,
    iSharedContact: Boolean(contactToThem),
    theySharedContact,
    canSeeContact: theySharedContact,
    pendingOutgoing,
    pendingIncoming,
    cooldownUntil,
    isShortlisted: store.shortlists.some(
      (s) => s.ownerProfileId === viewerId && s.targetProfileId === otherId,
    ),
  };
}

// ---------------------------------------------------------------------------
// Browse
// ---------------------------------------------------------------------------

/**
 * Rule 6 lives here: the opposite-gender filter is applied to the row set
 * before anything else, so a same-gender profile never enters the client.
 */
function visibleProfilesFor(viewer: Profile): Profile[] {
  const store = db();
  const ownIds = new Set(
    store.accounts.find((a) => a.id === store.session.accountId)?.ownedProfileIds ?? [],
  );
  return store.profiles.filter(
    (p) => p.gender !== viewer.gender && !ownIds.has(p.id) && p.status === 'active',
  );
}

/** Viewer→profile distance. Same city -> 0. */
function distanceFor(viewer: Profile, p: Profile): number {
  return haversineKm(viewer.cityLat, viewer.cityLng, p.cityLat, p.cityLng);
}

function matchesFilters(p: Profile, f: ProfileFilters, viewer: Profile): boolean {
  const age = ageFromDob(p.dob);
  if (f.ageMin !== undefined && age < f.ageMin) return false;
  if (f.ageMax !== undefined && age > f.ageMax) return false;
  if (f.heightMinCm !== undefined && p.heightCm < f.heightMinCm) return false;
  if (f.heightMaxCm !== undefined && p.heightCm > f.heightMaxCm) return false;
  if (f.maritalStatus?.length && !f.maritalStatus.includes(p.maritalStatus)) return false;
  if (f.educationLevel?.length && !f.educationLevel.includes(p.educationLevel)) return false;
  if (f.occupationCategory?.length && !f.occupationCategory.includes(p.occupationCategory)) {
    return false;
  }
  if (f.incomeBand?.length && !f.incomeBand.includes(p.incomeBand)) return false;
  if (f.religion?.length && !f.religion.includes(p.religion)) return false;
  if (f.category?.length && !f.category.includes(p.category)) return false;
  if (f.state && p.state !== f.state) return false;
  if (f.district && p.district !== f.district) return false;
  if (f.city && p.city !== f.city) return false;
  if (f.maxDistanceKm !== undefined && distanceFor(viewer, p) > f.maxDistanceKm) return false;
  if (f.manglik?.length && !f.manglik.includes(p.manglik)) return false;
  if (f.diet?.length && !f.diet.includes(p.diet)) return false;
  if (f.verifiedOnly && !p.isVerified) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Partner preferences
// ---------------------------------------------------------------------------

/**
 * What a family is assumed to want until they say otherwise — the same
 * starting point a matrimony site fills in at sign-up from the biodata:
 * the customary age window, the same religion and the same marital standing.
 * Place, manglik, education and the rest stay open until the family narrows
 * them in Settings, so a brand-new profile sees a list rather than a blank.
 * These defaults are never stored; saving from Settings is what persists.
 */
export function defaultPreferencesFor(): PartnerPreferences {
  // Nothing by default: until the family sets a preference, the Matches order
  // comes straight from the biodata-to-biodata compatibility score.
  return {};
}

/** Stored preferences, or the derived defaults when the family has not set any. */
function preferencesFor(p: Profile): { prefs: PartnerPreferences; isDefault: boolean } {
  const row = db().preferences.find((x) => x.profileId === p.id);
  return row ? { prefs: row.prefs, isDefault: false } : { prefs: defaultPreferencesFor(), isDefault: true };
}

/** Drop keys that mean "doesn't matter", so an empty list never counts as a criterion. */
function cleanPreferences(prefs: PartnerPreferences): PartnerPreferences {
  const out: PartnerPreferences = {};
  for (const [k, v] of Object.entries(prefs) as Array<[keyof PartnerPreferences, unknown]>) {
    if (k === ('sort' as string)) continue;
    if (v === undefined || v === null || v === '' || v === false) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export async function getPartnerPreferences(): Promise<{
  prefs: PartnerPreferences;
  /** True while the family is still on the derived defaults. */
  isDefault: boolean;
}> {
  await delay(80);
  return preferencesFor(requireActiveProfile());
}

export async function updatePartnerPreferences(
  prefs: PartnerPreferences,
): Promise<PartnerPreferences> {
  await delay(300);
  const profile = requireActiveProfile();
  const clean = cleanPreferences(prefs);
  db().upsertPreference({ profileId: profile.id, prefs: clean, updatedAt: new Date().toISOString() });
  return clean;
}

/** Does `candidate` satisfy every criterion `owner` set? Distance is measured from the owner. */
function satisfiesPreferences(owner: Profile, candidate: Profile): boolean {
  return matchesFilters(candidate, preferencesFor(owner).prefs, owner);
}

/**
 * Preference tier — the first sort key everywhere a list is "best match":
 *   2  2-way: fits the viewer's preferences AND the viewer fits theirs
 *   1  fits the viewer's preferences
 *   0  everything else
 * Nothing is hidden by this; it only decides who is at the top.
 */
function preferenceTier(
  viewer: Profile,
  p: Profile,
): { tier: 0 | 1 | 2; isExact: boolean; isMutual: boolean } {
  const isExact = satisfiesPreferences(viewer, p);
  const isMutual = isExact && satisfiesPreferences(p, viewer);
  return { tier: isMutual ? 2 : isExact ? 1 : 0, isExact, isMutual };
}

/**
 * Best-match score, in the family's own priority order:
 *
 *   1. Place — same tehsil first, then same district, same state, then by
 *      plain distance. The biggest slice of the score by far.
 *   2. Manglik — a manglik viewer sees manglik profiles first (and a
 *      non-manglik viewer sees non-manglik first); "unknown" sits between.
 *   3. Marital status — a divorced or widowed family sees divorced/widowed
 *      profiles first; a never-married family sees never-married first.
 *   4. Jati.
 *   5. Fit — the finer signals a family weighs once the above all line up:
 *      customary age gap (boy 0–5 years older), education, income, height,
 *      diet, then verification and recent activity. These break the ties
 *      that rules 1–4 leave behind, so two same-tehsil profiles are not
 *      ordered merely by who opened the app last.
 *
 * Weights are separated by magnitude so a lower rule can never outvote a
 * higher one: the whole fit tier (max 79) is worth less than one jati point
 * band (80). This only ORDERS the list — nothing is hidden by it.
 *
 * Every compatibility rule is symmetric — score(a, b) === score(b, a) — so a
 * profile that ranks high for the viewer also has the viewer ranking high for
 * it. That is the reciprocity a match needs, without a separate preference
 * table. Only the two small nudges at the end (verified, recently active)
 * look at one side.
 */
function matchScore(viewer: Profile, p: Profile): number {
  let score = 0;

  // 1. Place — 0..1000
  if (p.city === viewer.city && p.district === viewer.district) score += 1000;
  else if (p.district === viewer.district && p.state === viewer.state) score += 700;
  else if (p.state === viewer.state) score += 400;
  else score += Math.max(0, 250 - distanceFor(viewer, p));

  // 2. Manglik — 0..250
  const vM = viewer.manglik;
  const pM = p.manglik;
  if (vM === 'yes' || vM === 'partial') {
    score += pM === 'yes' || pM === 'partial' ? 250 : pM === 'unknown' ? 125 : 0;
  } else if (vM === 'no') {
    score += pM === 'no' ? 250 : pM === 'unknown' ? 125 : 0;
  } else {
    score += 125; // viewer unknown — manglik should not reorder their list much
  }

  // 3. Marital status — 0..150
  const remarriage = (m: Profile['maritalStatus']) => m !== 'never_married';
  if (p.maritalStatus === viewer.maritalStatus) score += 150;
  else if (remarriage(p.maritalStatus) === remarriage(viewer.maritalStatus)) score += 100;

  // 4. Jati — 0..80
  if (p.community === viewer.community && p.religion === viewer.religion) score += 80;
  else if (p.religion === viewer.religion) score += 40;

  // 5. Fit — 0..79
  score += fitScore(viewer, p);

  return score;
}

/** Low → high, mirrors the IncomeBand union. Index distance = band gap. */
const INCOME_ORDER: IncomeBand[] = [
  'upto_15k',
  '15k_25k',
  '25k_35k',
  '35k_45k',
  '45k_55k',
  '55k_65k',
  '65k_75k',
  '75k_85k',
  '85k_1l',
  'above_1l',
];

/** Rough rungs. Professional (CA, MBBS, LLB) sits with masters, not above doctorate. */
const EDUCATION_RANK: Record<EducationLevel, number> = {
  high_school: 0,
  diploma: 1,
  bachelors: 2,
  masters: 3,
  professional: 3,
  doctorate: 4,
  teaching: 2, // B.Ed sits on a graduate degree; TET/PAT on top of that
  other: 2, // unknown level: treat as middle of the ladder, neither a bonus nor a penalty
};

const RECENTLY_ACTIVE_DAYS = 7;

/**
 * Rule 5 of `matchScore`. Weights sum to 79 so the tier as a whole stays
 * below a single jati band. Age gap is the largest slice because it is the
 * first thing a family checks after place and jati.
 */
function fitScore(viewer: Profile, p: Profile): number {
  let score = 0;

  // Boy's side minus girl's side, for the two customs that have a direction.
  const [boy, girl] = viewer.gender === 'male' ? [viewer, p] : [p, viewer];

  // Age gap — 0..24. Boy 0–5 years older is the custom; taper outside it.
  const ageGap = ageFromDob(boy.dob) - ageFromDob(girl.dob);
  if (ageGap >= 0 && ageGap <= 5) score += 24;
  else score += Math.max(0, 24 - Math.abs(ageGap - 2.5) * 5);

  // Education — 0..15. Same rung best; one rung apart is normal.
  const eduGap = Math.abs(EDUCATION_RANK[viewer.educationLevel] - EDUCATION_RANK[p.educationLevel]);
  score += eduGap === 0 ? 15 : eduGap === 1 ? 10 : eduGap === 2 ? 4 : 0;

  // Income — 0..12. Within one band feels like the same standing.
  const incomeGap = Math.abs(
    INCOME_ORDER.indexOf(viewer.incomeBand) - INCOME_ORDER.indexOf(p.incomeBand),
  );
  score += incomeGap <= 1 ? 12 : incomeGap === 2 ? 8 : incomeGap === 3 ? 4 : 0;

  // Height — 0..12. Boy taller by 5–20 cm is what biodata sheets ask for.
  const heightGap = boy.heightCm - girl.heightCm;
  if (heightGap >= 5 && heightGap <= 20) score += 12;
  else if (heightGap >= 0 && heightGap <= 25) score += 7;

  // Diet — 0..8. Same diet best; vegetarian and Jain households mix easily.
  const vegLike = (d: Profile['diet']) => d === 'vegetarian' || d === 'jain_vegetarian';
  if (p.diet === viewer.diet) score += 8;
  else if (vegLike(p.diet) && vegLike(viewer.diet)) score += 5;

  // Verified — 0..4. A checked biodata is worth a nudge, never a rule.
  if (p.isVerified) score += 4;

  // Recently active — 0..4. A family that will actually answer.
  if (Date.now() - new Date(p.lastActiveAt).getTime() <= RECENTLY_ACTIVE_DAYS * DAY) score += 4;

  return score;
}

export async function getProfiles(
  filters: ProfileFilters = {},
): Promise<Paginated<BrowseCard>> {
  await delay();
  const viewer = requireActiveProfile();
  const rows = visibleProfilesFor(viewer).filter((p) => matchesFilters(p, filters, viewer));

  const sort = filters.sort ?? 'best_match';
  const tiers = new Map(rows.map((p) => [p.id, preferenceTier(viewer, p)]));
  const sorted = [...rows].sort((a, b) => {
    if (sort === 'recently_active') return b.lastActiveAt.localeCompare(a.lastActiveAt);
    if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt);
    // Best match — profiles that fit the family's preferences first, then the
    // compatibility score; ties go to the more recently active family.
    return (
      tiers.get(b.id)!.tier - tiers.get(a.id)!.tier ||
      matchScore(viewer, b) - matchScore(viewer, a) ||
      b.lastActiveAt.localeCompare(a.lastActiveAt)
    );
  });

  return {
    items: sorted.map((profile) => ({
      profile,
      age: ageFromDob(profile.dob),
      distanceKm: distanceFor(viewer, profile),
      isShortlisted: db().shortlists.some(
        (s) => s.ownerProfileId === viewer.id && s.targetProfileId === profile.id,
      ),
      stage: buildConnectionState(viewer.id, profile.id).stage,
      isExact: tiers.get(profile.id)!.isExact,
      isMutual: tiers.get(profile.id)!.isMutual,
    })),
    total: sorted.length,
  };
}

/**
 * How many profiles a filter set would return, without building the cards.
 * Powers the bottom sheet's "Show 34 profiles" button and the relax-filter
 * suggestion on the empty state.
 */
/**
 * Matches — every visible profile, nothing hidden, ordered so the suggestions
 * at the top are the exact ones: 2-way matches first (both families'
 * preferences fit), then profiles that fit the viewer's preferences, then the
 * rest by compatibility score. Each card carries its tier so the UI can stamp it.
 */
export async function getMatchedProfiles(): Promise<BrowseCard[]> {
  await delay();
  const viewer = requireActiveProfile();
  const rows = visibleProfilesFor(viewer)
    .map((profile) => ({
      profile,
      ...preferenceTier(viewer, profile),
      score: matchScore(viewer, profile),
    }))
    .sort(
      (a, b) =>
        b.tier - a.tier ||
        b.score - a.score ||
        b.profile.lastActiveAt.localeCompare(a.profile.lastActiveAt),
    );

  return rows.map(({ profile, isExact, isMutual }) => ({
    profile,
    age: ageFromDob(profile.dob),
    distanceKm: distanceFor(viewer, profile),
    isShortlisted: db().shortlists.some(
      (s) => s.ownerProfileId === viewer.id && s.targetProfileId === profile.id,
    ),
    stage: buildConnectionState(viewer.id, profile.id).stage,
    isExact,
    isMutual,
  }));
}

/** How many of the visible profiles fit the preferences — for the Matches header. */
export async function getMatchCounts(): Promise<{ total: number; exact: number; mutual: number }> {
  await delay(60);
  const viewer = requireActiveProfile();
  const rows = visibleProfilesFor(viewer).map((p) => preferenceTier(viewer, p));
  return {
    total: rows.length,
    exact: rows.filter((r) => r.isExact).length,
    mutual: rows.filter((r) => r.isMutual).length,
  };
}

export async function countProfiles(filters: ProfileFilters = {}): Promise<number> {
  await delay(60);
  const viewer = requireActiveProfile();
  return visibleProfilesFor(viewer).filter((p) => matchesFilters(p, filters, viewer)).length;
}

/** Distinct values present in the viewer's visible set — filters never offer a dead option. */
export async function getFilterOptions(): Promise<{
  religions: Religion[];
  ageRange: [number, number];
  heightRange: [number, number];
}> {
  await delay(80);
  const viewer = requireActiveProfile();
  const rows = visibleProfilesFor(viewer);
  const ages = rows.map((p) => ageFromDob(p.dob));
  const heights = rows.map((p) => p.heightCm);
  return {
    religions: [...new Set(rows.map((p) => p.religion))].sort(),
    ageRange: [Math.min(...ages, 21), Math.max(...ages, 35)],
    heightRange: [Math.min(...heights, 145), Math.max(...heights, 190)],
  };
}

// ---------------------------------------------------------------------------
// Profile detail
// ---------------------------------------------------------------------------

/**
 * Returns a stage-aware view. `revealed` contains ONLY the fields the viewer
 * has earned — locked fields are absent from the object, not blanked out, so a
 * careless component cannot render them.
 */
export async function getProfile(code: string): Promise<ProfileView> {
  await delay();
  const viewer = requireActiveProfile();
  const profile = resolveCode(code);

  if (profile.id !== viewer.id && profile.gender === viewer.gender) {
    throw new ApiError('SAME_GENDER', 'This profile is not shown for your search.');
  }

  const connection = buildConnectionState(viewer.id, profile.id);
  const priv = db().profilePrivates.find((p) => p.profileId === profile.id);
  const isOwn = profile.id === viewer.id;

  const revealed: ProfileView['revealed'] = {
    phoneMasked: maskPhone(priv?.phone ?? ''),
  };
  // One gate: the other family said yes to the number request.
  if (isOwn || connection.canSeeContact) {
    revealed.fullName = priv?.fullName;
    revealed.phone = priv?.phone;
    revealed.exactAddress = priv?.exactAddress;
    revealed.familyDetails = priv?.familyDetails;
    revealed.photoUrls = priv?.photoUrls ?? [];
  }

  return {
    profile,
    connection,
    age: ageFromDob(profile.dob),
    distanceKm: distanceFor(viewer, profile),
    revealed,
  };
}

export async function getConnectionState(otherProfileId: string): Promise<ConnectionState> {
  await delay(60);
  const viewer = requireActiveProfile();
  return buildConnectionState(viewer.id, otherProfileId);
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

/**
 * The only request the app sends is for the number. The guards here keep a
 * family from asking twice, asking someone who already said yes, or asking
 * again inside the cooldown after a no.
 */
export async function sendRequest(
  toProfileId: string,
  type: RequestType,
  message = '',
): Promise<Request> {
  await delay(300);
  const viewer = requireActiveProfile();
  const target = getProfileById(toProfileId);

  if (target.gender === viewer.gender) {
    throw new ApiError('SAME_GENDER', 'This profile is not shown for your search.');
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new ApiError(
      'MESSAGE_TOO_LONG',
      `Shorten your message to ${MAX_MESSAGE_LENGTH} characters or fewer.`,
    );
  }

  if (type !== 'contact') {
    throw new ApiError('FORBIDDEN', 'Only a number request can be sent.');
  }

  const conn = buildConnectionState(viewer.id, toProfileId);

  if (conn.pendingOutgoing.contact) {
    throw new ApiError('DUPLICATE_REQUEST', 'You have already asked. Wait for their answer.');
  }
  if (conn.theySharedContact) {
    throw new ApiError('DUPLICATE_REQUEST', 'They have already shared their number with you.');
  }
  if (conn.cooldownUntil) {
    const days = Math.ceil((new Date(conn.cooldownUntil).getTime() - Date.now()) / DAY);
    throw new ApiError(
      'COOLDOWN_ACTIVE',
      `This family declined earlier. You can ask again in ${days} day${days === 1 ? '' : 's'}.`,
    );
  }

  const store = db();
  const request: Request = {
    id: store.takeId('r-'),
    fromProfileId: viewer.id,
    toProfileId,
    type,
    status: 'pending',
    message,
    createdAt: nowIso(),
    respondedAt: null,
  };
  store.insertRequest(request);
  return request;
}

/**
 * Accepting a photo or contact request creates a grant for the REQUESTER only.
 * Accepting a contact request never reveals the accepter's view — that needs a
 * second, opposite grant, which is exactly rule 5.
 */
export async function respondToRequest(
  requestId: string,
  action: 'accept' | 'decline',
): Promise<Request> {
  await delay(300);
  const viewer = requireActiveProfile();
  const store = db();
  const request = store.requests.find((r) => r.id === requestId);
  if (!request) throw new ApiError('REQUEST_NOT_FOUND', 'This request is no longer available.');
  if (request.toProfileId !== viewer.id) {
    throw new ApiError('FORBIDDEN', 'Only the family who received this request can answer it.');
  }
  if (request.status !== 'pending') {
    throw new ApiError('DUPLICATE_REQUEST', 'This request has already been answered.');
  }

  const respondedAt = nowIso();
  const status = action === 'accept' ? 'accepted' : 'declined';
  store.updateRequest(requestId, { status, respondedAt });

  if (action === 'accept' && request.type !== 'interest') {
    const scope = request.type; // 'photo' | 'contact'
    store.insertGrant({
      id: store.takeId('g-'),
      granteeProfileId: request.fromProfileId,
      targetProfileId: viewer.id,
      scope,
      grantedAt: respondedAt,
      expiresAt:
        scope === 'photo' ? new Date(Date.now() + PHOTO_GRANT_DAYS * DAY).toISOString() : null,
      revokedAt: null,
    });
  }

  return { ...request, status, respondedAt };
}

export async function withdrawRequest(requestId: string): Promise<Request> {
  await delay(250);
  const viewer = requireActiveProfile();
  const store = db();
  const request = store.requests.find((r) => r.id === requestId);
  if (!request) throw new ApiError('REQUEST_NOT_FOUND', 'This request is no longer available.');
  if (request.fromProfileId !== viewer.id) {
    throw new ApiError('FORBIDDEN', 'You can only withdraw a request you sent.');
  }
  if (request.status !== 'pending') {
    throw new ApiError('DUPLICATE_REQUEST', 'This request has already been answered.');
  }
  const respondedAt = nowIso();
  store.updateRequest(requestId, { status: 'withdrawn', respondedAt });
  return { ...request, status: 'withdrawn', respondedAt };
}

export async function getRequests(
  direction: 'received' | 'sent',
  type?: RequestType,
): Promise<RequestView[]> {
  await delay();
  const viewer = requireActiveProfile();
  const store = db();
  const rows = store.requests.filter((r) => {
    const mine = direction === 'received' ? r.toProfileId === viewer.id : r.fromProfileId === viewer.id;
    return mine && (!type || r.type === type);
  });

  return rows
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((request) => {
      const otherId =
        direction === 'received' ? request.fromProfileId : request.toProfileId;
      const otherProfile = store.profiles.find((p) => p.id === otherId)!;
      return {
        request,
        otherProfile,
        age: ageFromDob(otherProfile.dob),
        isIncoming: direction === 'received',
      };
    })
    .filter((v) => Boolean(v.otherProfile));
}

/** Badge counts for the bottom nav. */
export async function getPendingCounts(): Promise<{ received: number; sent: number }> {
  await delay(40);
  const viewer = requireActiveProfile();
  const rows = db().requests.filter((r) => r.status === 'pending');
  return {
    received: rows.filter((r) => r.toProfileId === viewer.id).length,
    sent: rows.filter((r) => r.fromProfileId === viewer.id).length,
  };
}

// ---------------------------------------------------------------------------
// Connections & grants
// ---------------------------------------------------------------------------

export async function getConnections(): Promise<ConnectionSummary[]> {
  await delay();
  const viewer = requireActiveProfile();
  const store = db();

  // Every family a number has passed between, in either direction.
  const others = new Map<string, string>(); // otherId -> when the first grant landed
  for (const g of store.grants) {
    if (g.scope !== 'contact' || !isGrantActive(g)) continue;
    const otherId =
      g.granteeProfileId === viewer.id
        ? g.targetProfileId
        : g.targetProfileId === viewer.id
          ? g.granteeProfileId
          : null;
    if (!otherId) continue;
    const prev = others.get(otherId);
    if (!prev || g.grantedAt < prev) others.set(otherId, g.grantedAt);
  }

  return [...others.entries()]
    .map(([otherId, connectedAt]) => {
      const profile = store.profiles.find((p) => p.id === otherId);
      if (!profile) return null;
      const connection = buildConnectionState(viewer.id, otherId);
      const row: ConnectionSummary = {
        profile,
        age: ageFromDob(profile.dob),
        connection,
        connectedAt,
      };
      if (connection.canSeeContact) {
        row.phone = store.profilePrivates.find((p) => p.profileId === otherId)?.phone;
      }
      return row;
    })
    .filter((x): x is ConnectionSummary => x !== null)
    .sort((a, b) => b.connectedAt.localeCompare(a.connectedAt));
}

/** Access the viewer has given away — the revoke list in settings. */
export async function getOutgoingGrants(): Promise<OutgoingGrantView[]> {
  await delay(120);
  const viewer = requireActiveProfile();
  const store = db();
  return store.grants
    .filter((g) => g.targetProfileId === viewer.id && isGrantActive(g))
    .map((grant) => ({
      grant,
      granteeCode:
        store.profiles.find((p) => p.id === grant.granteeProfileId)?.publicCode ?? 'Unknown',
      expiresInDays: grant.expiresAt
        ? Math.max(0, Math.ceil((new Date(grant.expiresAt).getTime() - Date.now()) / DAY))
        : null,
    }))
    .sort((a, b) => b.grant.grantedAt.localeCompare(a.grant.grantedAt));
}

export async function revokeGrant(grantId: string): Promise<void> {
  await delay(250);
  const viewer = requireActiveProfile();
  const store = db();
  const grant = store.grants.find((g) => g.id === grantId);
  if (!grant) throw new ApiError('REQUEST_NOT_FOUND', 'This access has already been removed.');
  if (grant.targetProfileId !== viewer.id) {
    throw new ApiError('FORBIDDEN', 'You can only take back access to your own details.');
  }
  store.updateGrant(grantId, { revokedAt: nowIso() });
}

// ---------------------------------------------------------------------------
// Shortlist
// ---------------------------------------------------------------------------

export async function toggleShortlist(targetProfileId: string): Promise<boolean> {
  await delay(180);
  const viewer = requireActiveProfile();
  const store = db();
  const existing = store.shortlists.find(
    (s) => s.ownerProfileId === viewer.id && s.targetProfileId === targetProfileId,
  );
  if (existing) {
    store.deleteShortlist(existing.id);
    return false;
  }
  getProfileById(targetProfileId);
  store.insertShortlist({
    id: store.takeId('s-'),
    ownerProfileId: viewer.id,
    targetProfileId,
    note: '',
    createdAt: nowIso(),
  });
  return true;
}

export async function updateShortlistNote(
  targetProfileId: string,
  note: string,
): Promise<void> {
  await delay(180);
  const viewer = requireActiveProfile();
  const store = db();
  const existing = store.shortlists.find(
    (s) => s.ownerProfileId === viewer.id && s.targetProfileId === targetProfileId,
  );
  if (!existing) throw new ApiError('REQUEST_NOT_FOUND', 'Save this profile before adding a note.');
  store.updateShortlist(existing.id, { note });
}

export async function getShortlist(): Promise<ShortlistView[]> {
  await delay();
  const viewer = requireActiveProfile();
  const store = db();
  return store.shortlists
    .filter((s) => s.ownerProfileId === viewer.id)
    .map((shortlist) => {
      const profile = store.profiles.find((p) => p.id === shortlist.targetProfileId);
      if (!profile) return null;
      return {
        shortlist,
        profile,
        age: ageFromDob(profile.dob),
        stage: buildConnectionState(viewer.id, profile.id).stage,
      };
    })
    .filter((x): x is ShortlistView => x !== null)
    .sort((a, b) => b.shortlist.createdAt.localeCompare(a.shortlist.createdAt));
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/**
 * Everything the wizard collects can be corrected from Settings. Only the
 * server-owned columns (id, code, status, verification, timestamps) stay out
 * of the family's hands.
 */
const EDITABLE_PROFILE_FIELDS = [
  'gender',
  'dob',
  'heightCm',
  'weightBand',
  'complexion',
  'education',
  'educationLevel',
  'occupation',
  'occupationCategory',
  'incomeBand',
  'religion',
  'category',
  'community',
  'maritalStatus',
  'manglik',
  'state',
  'district',
  'city',
  'village',
  'cityLat',
  'cityLng',
] as const;

export type EditableProfileField = (typeof EDITABLE_PROFILE_FIELDS)[number];

export async function updateMyProfile(
  patch: Partial<Pick<Profile, EditableProfileField>>,
): Promise<Profile> {
  await delay(350);
  const profile = requireActiveProfile();
  const clean: Partial<Profile> = {};
  for (const key of EDITABLE_PROFILE_FIELDS) {
    if (patch[key] !== undefined) (clean as Record<string, unknown>)[key] = patch[key];
  }
  // The legal age floor holds on edit exactly as it does at registration.
  const dob = (clean.dob as string | undefined) ?? profile.dob;
  const gender = (clean.gender as Profile['gender'] | undefined) ?? profile.gender;
  const minAge = gender === 'male' ? 21 : 18;
  if (ageFromDob(dob) < minAge) {
    throw new ApiError(
      'FORBIDDEN',
      `A ${gender === 'male' ? 'boy' : 'girl'} must be ${minAge} or older to be listed here.`,
    );
  }
  db().updateProfile(profile.id, clean);
  return getProfileById(profile.id);
}

export async function setProfileStatus(
  profileId: string,
  status: Extract<ProfileStatus, 'active' | 'paused' | 'matched'>,
): Promise<Profile> {
  await delay(250);
  const session = requireSession();
  const account = db().accounts.find((a) => a.id === session.accountId);
  if (!account?.ownedProfileIds.includes(profileId)) {
    throw new ApiError('FORBIDDEN', 'You can only change a profile you created.');
  }
  db().updateProfile(profileId, { status });
  return getProfileById(profileId);
}

export async function reportProfile(
  targetProfileId: string,
  reason: string,
): Promise<{ received: true }> {
  await delay(400);
  requireActiveProfile();
  getProfileById(targetProfileId);
  // No moderation table in the mock — the receipt is what the UI needs.
  if (!reason.trim()) {
    throw new ApiError('MESSAGE_TOO_LONG', 'Tell us briefly what is wrong, so we can check it.');
  }
  return { received: true };
}

/** Dev-only escape hatch, wired to the button in settings. */
export async function resetDemoData(): Promise<void> {
  await delay(300);
  db().resetDemoData();
}

/** Remove only the generated dummy rows (Profile.isSeed); real families stay. */
export async function removeSeedData(): Promise<void> {
  await delay(300);
  db().removeSeedData();
}

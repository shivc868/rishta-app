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
  BrowseCard,
  Religion,
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
  const digits = `+91${phone.replace(/\D/g, '').slice(-10)}`;
  const store = db();
  let account = store.accounts.find((a) => a.phone === digits);
  if (!account) {
    account = {
      id: store.takeId('acc-'),
      phone: digits,
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

export async function switchActiveProfile(profileId: string): Promise<Session> {
  await delay(120);
  const session = requireSession();
  const account = db().accounts.find((a) => a.id === session.accountId);
  if (!account?.ownedProfileIds.includes(profileId)) {
    throw new ApiError('FORBIDDEN', 'You can only switch to a profile you created.');
  }
  const next: Session = { ...session, activeProfileId: profileId };
  db().setSession(next);
  return next;
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
  education: string;
  educationLevel: EducationLevel;
  occupation: string;
  occupationCategory: OccupationCategory;
  incomeBand: IncomeBand;
  religion: Religion;
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

/** Creates the profile in `pending_review`. Returns the new public code. */
export async function createProfile(draft: ProfileDraft): Promise<Profile> {
  await delay(600);
  const session = requireSession();
  const store = db();
  const id = store.takeId('p-');
  const nextCode = 100 + store.profiles.length + 1;

  const profile: Profile = {
    id,
    publicCode: `RSH-${nextCode}`,
    gender: draft.gender,
    dob: draft.dob,
    heightCm: draft.heightCm,
    weightBand: draft.weightBand,
    education: draft.education,
    educationLevel: draft.educationLevel,
    occupation: draft.occupation,
    occupationCategory: draft.occupationCategory,
    incomeBand: draft.incomeBand,
    religion: draft.religion,
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
    status: 'pending_review',
    isVerified: false,
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
      (r.fromProfileId === viewerId && r.toProfileId === otherId) ||
      (r.fromProfileId === otherId && r.toProfileId === viewerId),
  );

  const interests = between.filter((r) => r.type === 'interest');
  const acceptedInterest = interests.find((r) => r.status === 'accepted') ?? null;
  const pendingInterest = interests.find((r) => r.status === 'pending') ?? null;
  const lastDeclined = interests
    .filter((r) => r.status === 'declined')
    .sort((a, b) => (a.respondedAt ?? '').localeCompare(b.respondedAt ?? ''))
    .at(-1) ?? null;

  const connected = Boolean(acceptedInterest);

  let stage: ConnectionStage = 'browsing';
  let interest: Request | null = acceptedInterest;
  if (connected) {
    stage = 'connected';
  } else if (pendingInterest) {
    interest = pendingInterest;
    stage = pendingInterest.fromProfileId === viewerId ? 'interest_sent' : 'interest_received';
  } else if (lastDeclined) {
    interest = lastDeclined;
    stage = lastDeclined.fromProfileId === viewerId ? 'declined_by_them' : 'declined_by_me';
  }

  // Cooldown applies only to the side that was turned down.
  let cooldownUntil: string | null = null;
  if (lastDeclined?.fromProfileId === viewerId && lastDeclined.respondedAt) {
    const until = new Date(lastDeclined.respondedAt).getTime() + DECLINE_COOLDOWN_DAYS * DAY;
    if (until > at) cooldownUntil = new Date(until).toISOString();
  }

  const activeGrants = store.grants.filter((g) => isGrantActive(g, at));
  const grantBetween = (grantee: string, target: string, scope: Grant['scope']) =>
    activeGrants.find(
      (g) => g.granteeProfileId === grantee && g.targetProfileId === target && g.scope === scope,
    ) ?? null;

  const photoGrantToMe = grantBetween(viewerId, otherId, 'photo');
  const photoGrantToThem = grantBetween(otherId, viewerId, 'photo');
  const contactToMe = grantBetween(viewerId, otherId, 'contact');
  const contactToThem = grantBetween(otherId, viewerId, 'contact');

  const pendingOutgoing: ConnectionState['pendingOutgoing'] = {};
  const pendingIncoming: ConnectionState['pendingIncoming'] = {};
  for (const r of between) {
    if (r.status !== 'pending') continue;
    if (r.fromProfileId === viewerId) pendingOutgoing[r.type] = r;
    else pendingIncoming[r.type] = r;
  }

  const iSharedContact = Boolean(contactToThem);
  const theySharedContact = Boolean(contactToMe);

  return {
    otherProfileId: otherId,
    stage,
    interest,
    canSeePhotos: Boolean(photoGrantToMe),
    theyCanSeeMyPhotos: Boolean(photoGrantToThem),
    photoGrantToMe,
    photoGrantToThem,
    iSharedContact,
    theySharedContact,
    // Rule 5, the strict form: one-sided approval reveals nothing.
    canSeeContact: iSharedContact && theySharedContact,
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
  if (f.community?.length && !f.community.includes(p.community)) return false;
  if (f.state && p.state !== f.state) return false;
  if (f.district && p.district !== f.district) return false;
  if (f.city && p.city !== f.city) return false;
  if (f.maxDistanceKm !== undefined && distanceFor(viewer, p) > f.maxDistanceKm) return false;
  if (f.manglik?.length && !f.manglik.includes(p.manglik)) return false;
  if (f.verifiedOnly && !p.isVerified) return false;
  return true;
}

export async function getProfiles(
  filters: ProfileFilters = {},
): Promise<Paginated<BrowseCard>> {
  await delay();
  const viewer = requireActiveProfile();
  const rows = visibleProfilesFor(viewer).filter((p) => matchesFilters(p, filters, viewer));

  const sorted = [...rows].sort((a, b) =>
    filters.sort === 'recently_active'
      ? b.lastActiveAt.localeCompare(a.lastActiveAt)
      : b.createdAt.localeCompare(a.createdAt),
  );

  return {
    items: sorted.map((profile) => ({
      profile,
      age: ageFromDob(profile.dob),
      distanceKm: distanceFor(viewer, profile),
      isShortlisted: db().shortlists.some(
        (s) => s.ownerProfileId === viewer.id && s.targetProfileId === profile.id,
      ),
      stage: buildConnectionState(viewer.id, profile.id).stage,
    })),
    total: sorted.length,
  };
}

/**
 * How many profiles a filter set would return, without building the cards.
 * Powers the bottom sheet's "Show 34 profiles" button and the relax-filter
 * suggestion on the empty state.
 */
export async function countProfiles(filters: ProfileFilters = {}): Promise<number> {
  await delay(60);
  const viewer = requireActiveProfile();
  return visibleProfilesFor(viewer).filter((p) => matchesFilters(p, filters, viewer)).length;
}

/** Distinct values present in the viewer's visible set — filters never offer a dead option. */
export async function getFilterOptions(): Promise<{
  religions: Religion[];
  jatis: string[];
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
    jatis: [...new Set(rows.map((p) => p.community))].sort(),
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
  if (isOwn || connection.canSeeContact) {
    revealed.fullName = priv?.fullName;
    revealed.phone = priv?.phone;
    revealed.exactAddress = priv?.exactAddress;
  }
  if (isOwn || connection.canSeePhotos) {
    revealed.photoUrls = priv?.photoUrls ?? [];
  }
  // Extended family detail opens at stage 2 — connected, but still no photo/number.
  if (isOwn || connection.stage === 'connected') {
    revealed.familyDetails = priv?.familyDetails;
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
 * Stage guard. Interest is the only request allowed before connection;
 * photo and contact require an accepted interest. Buttons cannot skip ahead
 * because this throws before the row is written.
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

  const conn = buildConnectionState(viewer.id, toProfileId);

  if (conn.pendingOutgoing[type]) {
    throw new ApiError('DUPLICATE_REQUEST', 'You have already sent this request. Wait for a reply.');
  }
  if (type === 'interest') {
    if (conn.stage === 'connected') {
      throw new ApiError('DUPLICATE_REQUEST', 'You are already connected with this profile.');
    }
    if (conn.cooldownUntil) {
      const days = Math.ceil((new Date(conn.cooldownUntil).getTime() - Date.now()) / DAY);
      throw new ApiError(
        'COOLDOWN_ACTIVE',
        `This family declined earlier. You can send interest again in ${days} day${days === 1 ? '' : 's'}.`,
      );
    }
  } else {
    if (conn.stage !== 'connected') {
      throw new ApiError(
        'NOT_CONNECTED',
        'Send an interest first. Photos and numbers open only after both families agree.',
      );
    }
    if (type === 'photo' && conn.canSeePhotos) {
      throw new ApiError('DUPLICATE_REQUEST', 'You can already see these photos.');
    }
    if (type === 'contact' && conn.theySharedContact) {
      throw new ApiError('DUPLICATE_REQUEST', 'They have already shared their number with you.');
    }
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
  const accepted = store.requests.filter(
    (r) =>
      r.type === 'interest' &&
      r.status === 'accepted' &&
      (r.fromProfileId === viewer.id || r.toProfileId === viewer.id),
  );

  return accepted
    .map((r) => {
      const otherId = r.fromProfileId === viewer.id ? r.toProfileId : r.fromProfileId;
      const profile = store.profiles.find((p) => p.id === otherId);
      if (!profile) return null;
      return {
        profile,
        age: ageFromDob(profile.dob),
        connection: buildConnectionState(viewer.id, otherId),
        connectedAt: r.respondedAt ?? r.createdAt,
      };
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

/**
 * Seeded mock database. Stands in for Postgres until Supabase is wired up.
 *
 * Everything is generated from a fixed seed so profile codes, ages and pairings
 * are stable across reloads and across developers — a demo that reshuffles on
 * every refresh is impossible to talk about in a review.
 *
 * Photos are gradient tokens ("grad:340:26"), never real people. The UI turns
 * the two numbers into hues; nothing here is a face.
 */

import type {
  Account,
  Religion,
  Complexion,
  Diet,
  EducationLevel,
  Gender,
  Grant,
  IncomeBand,
  Manglik,
  MaritalStatus,
  OccupationCategory,
  Profile,
  ProfilePrivate,

  Request,
  Shortlist,
  SocialCategory,
} from '@/types';


// --- deterministic RNG ------------------------------------------------------

/** Mulberry32 — small, fast, and stable across engines. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = rng(20260818);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

/**
 * All timestamps are relative to a frozen "now" so the seed data always looks
 * the same distance in the past. The store rebases this on first load.
 */
export const DEMO_EPOCH = new Date('2026-08-18T09:00:00.000Z').getTime();
const DAY = 86_400_000;
const daysAgo = (d: number) => new Date(DEMO_EPOCH - d * DAY).toISOString();

// --- name & attribute pools -------------------------------------------------

const MALE_FIRST = [
  'Aditya', 'Rohit', 'Vikas', 'Sandeep', 'Manish', 'Deepak', 'Ankur', 'Praveen',
  'Sumit', 'Nitin', 'Rajat', 'Gaurav', 'Mohit', 'Yogesh', 'Arun', 'Pankaj',
  'Saurabh', 'Amit', 'Naveen', 'Harsh', 'Vivek', 'Tarun',
];

const FEMALE_FIRST = [
  'Priya', 'Neha', 'Kavita', 'Shalini', 'Ritu', 'Anjali', 'Pooja', 'Swati',
  'Meenakshi', 'Divya', 'Nisha', 'Sunita', 'Rekha', 'Payal', 'Aarti', 'Jyoti',
  'Bhavna', 'Sarita', 'Komal', 'Renu', 'Mamta', 'Shweta',
];

const SURNAMES = [
  'Sharma', 'Verma', 'Gupta', 'Agarwal', 'Mittal', 'Saxena', 'Bansal', 'Goyal',
  'Jain', 'Sinha', 'Chaudhary', 'Yadav', 'Tyagi', 'Rastogi', 'Khandelwal', 'Garg',
];

/** religion -> jatis, weighted for each belt. HP is Hindu-heavy hills; Punjab is Sikh-majority. */
/** Roughly the HP/Punjab mix: general-heavy, with OBC/SC/ST present. */
const CATEGORIES: SocialCategory[] = ['general', 'general', 'general', 'obc', 'sc', 'sc', 'st'];

const HP_RELIGION_JATIS: Array<{ religion: Religion; jatis: string[] }> = [
  { religion: 'hindu', jatis: ['Brahmin', 'Rajput', 'Choudhary', 'Sood', 'Mahajan', 'Gaddi', 'Dhiman', 'Koli'] },
  { religion: 'hindu', jatis: ['Brahmin', 'Rajput', 'Choudhary', 'Sood', 'Mahajan', 'Gaddi', 'Dhiman', 'Koli'] },
  { religion: 'hindu', jatis: ['Brahmin', 'Rajput', 'Choudhary', 'Sood', 'Mahajan', 'Gaddi', 'Dhiman', 'Koli'] },
  { religion: 'hindu', jatis: ['Brahmin', 'Rajput', 'Choudhary', 'Sood', 'Mahajan', 'Gaddi', 'Dhiman', 'Koli'] },
  { religion: 'hindu', jatis: ['Brahmin', 'Rajput', 'Choudhary', 'Sood', 'Mahajan', 'Gaddi', 'Dhiman', 'Koli'] },
  { religion: 'sikh', jatis: ['Jat Sikh', 'Saini Sikh', 'Ramgarhia'] },
  { religion: 'buddhist', jatis: ['Bodh'] },
  { religion: 'muslim', jatis: ['Sheikh', 'Gujjar (Muslim)'] },
];

const PB_RELIGION_JATIS: Array<{ religion: Religion; jatis: string[] }> = [
  { religion: 'sikh', jatis: ['Jat Sikh', 'Khatri Sikh', 'Arora Sikh', 'Ramgarhia', 'Saini Sikh', 'Labana'] },
  { religion: 'sikh', jatis: ['Jat Sikh', 'Khatri Sikh', 'Arora Sikh', 'Ramgarhia', 'Saini Sikh', 'Labana'] },
  { religion: 'sikh', jatis: ['Jat Sikh', 'Khatri Sikh', 'Arora Sikh', 'Ramgarhia', 'Saini Sikh', 'Labana'] },
  { religion: 'hindu', jatis: ['Khatri', 'Arora', 'Brahmin', 'Baniya / Agarwal'] },
  { religion: 'hindu', jatis: ['Khatri', 'Arora', 'Brahmin', 'Baniya / Agarwal'] },
  { religion: 'christian', jatis: ['Catholic'] },
];

/**
 * Seed geography: 75 profiles from the Kangra–Una–Hamirpur belt of Himachal
 * Pradesh, 25 from Hoshiarpur district in Punjab — the register's home turf.
 * District and tehsil names are copied verbatim from /india-admin.json so the
 * cascading location filter matches seeded rows exactly; coordinates are the
 * tehsil towns' real ones, so the radius filter stays honest. Villages belong
 * to their own tehsil, so a card never pairs a Nurpur village with Nadaun.
 * '' = lives in the tehsil town itself.
 */
interface SeedPlace {
  state: string;
  district: string;
  city: string;
  lat: number;
  lng: number;
  villages: string[];
}

const TOWN = ['', '', ''];

const HP_PLACES: SeedPlace[] = [
  // Kangra — lower belt along the Punjab border
  { state: 'Himachal Pradesh', district: 'Kangra', city: 'Fatehpur', lat: 32.071, lng: 75.902,
    villages: [...TOWN, 'Rey', 'Raja Ka Talab', 'Sthana', 'Golwan', 'Bhatoli'] },
  { state: 'Himachal Pradesh', district: 'Kangra', city: 'Nurpur', lat: 32.297, lng: 75.891,
    villages: [...TOWN, 'Sadwan', 'Jassur', 'Ganoh', 'Ladori', 'Bhadwar', 'Kandwal'] },
  { state: 'Himachal Pradesh', district: 'Kangra', city: 'Indora', lat: 32.128, lng: 75.652,
    villages: [...TOWN, 'Damtal', 'Kandrori', 'Mand Miani', 'Dhameta', 'Riali'] },
  { state: 'Himachal Pradesh', district: 'Kangra', city: 'Jawali', lat: 32.147, lng: 76.002,
    villages: [...TOWN, 'Kotla', 'Nagrota Surian', 'Harsar', 'Sihunta', 'Bhali'] },
  // Una
  { state: 'Himachal Pradesh', district: 'Una', city: 'Una', lat: 31.465, lng: 76.269,
    villages: [...TOWN, 'Santoshgarh', 'Mehatpur', 'Basdehra', 'Rampur', 'Jhalera'] },
  { state: 'Himachal Pradesh', district: 'Una', city: 'Amb', lat: 31.68, lng: 76.12,
    villages: ['Daulatpur Chowk', 'Daulatpur Chowk', 'Daulatpur Chowk', 'Gagret', 'Ambota', 'Chintpurni'] },
  // Hamirpur
  { state: 'Himachal Pradesh', district: 'Hamirpur', city: 'Hamirpur', lat: 31.686, lng: 76.522,
    villages: [...TOWN, 'Tauni Devi', 'Dhaneta', 'Bhota', 'Anu', 'Kangoo'] },
  { state: 'Himachal Pradesh', district: 'Hamirpur', city: 'Nadaun', lat: 31.783, lng: 76.343,
    villages: [...TOWN, 'Jalari', 'Galore', 'Bela', 'Rangas', 'Kohla'] },
  { state: 'Himachal Pradesh', district: 'Hamirpur', city: 'Barsar', lat: 31.548, lng: 76.352,
    villages: [...TOWN, 'Bijhri', 'Dhaned', 'Chakmoh', 'Bani', 'Samtana'] },
  { state: 'Himachal Pradesh', district: 'Hamirpur', city: 'Bhoranj', lat: 31.623, lng: 76.62,
    villages: [...TOWN, 'Jahu', 'Bhareri', 'Ladraur', 'Tarkwari', 'Kanjyan'] },
  { state: 'Himachal Pradesh', district: 'Hamirpur', city: 'Tira Sujanpur', lat: 31.835, lng: 76.503,
    villages: [...TOWN, 'Sujanpur Tira', 'Khairi', 'Jangal Beri', 'Chabutra', 'Patlander'] },
];

const PB_PLACES: SeedPlace[] = [
  { state: 'Punjab', district: 'Hoshiarpur', city: 'Hoshiarpur', lat: 31.537, lng: 75.913,
    villages: [...TOWN, 'Bassi Kalan', 'Hariana', 'Sham Chaurasi', 'Chabbewal', 'Bhunga', 'Piplanwala'] },
  { state: 'Punjab', district: 'Hoshiarpur', city: 'Hoshiarpur', lat: 31.537, lng: 75.913,
    villages: [...TOWN, 'Bassi Kalan', 'Hariana', 'Sham Chaurasi', 'Chabbewal', 'Bhunga', 'Piplanwala'] },
  { state: 'Punjab', district: 'Hoshiarpur', city: 'Dasua', lat: 31.817, lng: 75.653,
    villages: [...TOWN, 'Tanda', 'Gardhiwala', 'Miani', 'Budhabar'] },
  { state: 'Punjab', district: 'Hoshiarpur', city: 'Mukerian', lat: 31.954, lng: 75.617,
    villages: [...TOWN, 'Talwara', 'Hajipur', 'Bhangala', 'Naushehra'] },
  { state: 'Punjab', district: 'Hoshiarpur', city: 'Garhshankar', lat: 31.215, lng: 76.141,
    villages: [...TOWN, 'Mahilpur', 'Saila Khurd', 'Posi', 'Binewal'] },
];

const EDUCATION: Array<{ label: string; level: EducationLevel }> = [
  { label: 'B.A.', level: 'bachelors' },
  { label: 'B.Com.', level: 'bachelors' },
  { label: 'B.Sc. (Maths)', level: 'bachelors' },
  { label: 'B.Tech (Mechanical)', level: 'bachelors' },
  { label: 'B.Tech (Computer Science)', level: 'bachelors' },
  { label: 'M.A. (Hindi)', level: 'masters' },
  { label: 'M.Com.', level: 'masters' },
  { label: 'M.Sc. (Chemistry)', level: 'masters' },
  { label: 'MBA (Finance)', level: 'masters' },
  { label: 'MCA', level: 'masters' },
  { label: 'B.Ed.', level: 'professional' },
  { label: 'MBBS', level: 'professional' },
  { label: 'B.D.S.', level: 'professional' },
  { label: 'C.A.', level: 'professional' },
  { label: 'LL.B.', level: 'professional' },
  { label: 'Polytechnic Diploma', level: 'diploma' },
  { label: 'Intermediate (12th)', level: 'high_school' },
  { label: 'Ph.D. (Economics)', level: 'doctorate' },
];

/** The specific job is free text; the category is only the filter grouping. */
const OCCUPATIONS: Array<{ label: string; category: OccupationCategory }> = [
  { label: 'Government school teacher', category: 'government' },
  { label: 'Lecturer, degree college', category: 'government' },
  { label: 'Bank officer (PNB)', category: 'government' },
  { label: 'Railway clerk', category: 'government' },
  { label: 'Junior engineer, UPPCL', category: 'government' },
  { label: 'Software engineer', category: 'private_job' },
  { label: 'IT support executive', category: 'private_job' },
  { label: 'Doctor (MBBS), city hospital', category: 'private_job' },
  { label: 'Pharmacist', category: 'private_job' },
  { label: 'Private company — accounts', category: 'private_job' },
  { label: 'Private company — sales', category: 'private_job' },
  { label: 'Family business — cloth shop', category: 'business' },
  { label: 'Family business — hardware', category: 'business' },
  { label: 'Wholesale grain trading', category: 'business' },
  { label: 'Dentist, own clinic', category: 'self_employed' },
  { label: 'Chartered accountant, own practice', category: 'self_employed' },
  { label: 'Advocate, district court', category: 'self_employed' },
  { label: 'Boutique / tailoring at home', category: 'self_employed' },
  { label: 'Preparing for competitive exams', category: 'student' },
  { label: 'Homemaker', category: 'not_working' },
];

/**
 * Weighted towards the middle of the ladder — a small-town register is mostly
 * ₹25k–65k earners, and a pool where every band is equally likely makes the
 * income filter look uniform in a way real data never is.
 */
const INCOME_BANDS: IncomeBand[] = [
  'upto_15k',
  '15k_25k', '15k_25k',
  '25k_35k', '25k_35k', '25k_35k',
  '35k_45k', '35k_45k', '35k_45k',
  '45k_55k', '45k_55k',
  '55k_65k', '55k_65k',
  '65k_75k',
  '75k_85k',
  '85k_1l',
  'above_1l',
];

const DIETS: Diet[] = ['vegetarian', 'vegetarian', 'vegetarian', 'eggetarian', 'jain_vegetarian', 'non_vegetarian'];
const MANGLIK: Manglik[] = ['no', 'no', 'no', 'yes', 'partial', 'unknown'];
// Weighted the way the region actually skews: wheatish shades dominate.
const COMPLEXIONS: Complexion[] = [
  'very_fair',
  'fair',
  'fair',
  'medium',
  'wheatish',
  'wheatish',
  'wheatish',
  'wheatish_brown',
  'wheatish_brown',
  'dusky',
  'dusky',
  'dark',
];
const MARITAL: MaritalStatus[] = [
  'never_married', 'never_married', 'never_married', 'never_married',
  'never_married', 'never_married', 'divorced', 'widowed',
];

const ABOUT_MALE = [
  'Simple family values, does not drink or smoke. Interested in a partner who respects elders.',
  'Settled in job, owns a house in the town. Looking for a homely and educated girl.',
  'Sports and reading are his interests. Family wants an educated, working girl.',
  'Well settled in family business. Looking for a girl from a similar background.',
  'Soft spoken, does not drink or smoke. Prefers a girl who can adjust in a joint family.',
];

const ABOUT_FEMALE = [
  'Homely and educated, good at cooking and household work. Also working part time.',
  'Working in a government school, wants to continue after marriage.',
  'Fond of music and painting. Family looking for a well settled boy from a good family.',
  'Completed her studies and now helping in family business. Simple and religious.',
  'Independent and educated, family wants a boy who supports her career.',
];

const FAMILY_BRIEF = [
  'Father retired from bank, mother homemaker. One younger sister, studying.',
  'Joint family, father in family business. Two brothers, both married.',
  'Nuclear family. Father is a government employee, mother a teacher.',
  'Father runs a shop in the main market. One elder brother, settled in Delhi.',
  'Middle class, religious family. Own house in town. Mother is a homemaker.',
  'Father retired from railways. Family is well known in the community.',
];

const FAMILY_DETAILS = [
  'Father: Retired Manager, Punjab National Bank. Mother: Homemaker. Sister: B.Sc. 2nd year. Own house, two shops on rent.',
  'Father: Wholesale cloth business, main market. Mother: Homemaker. Elder brother married, lives separately. Joint family of 7.',
  'Father: Assistant Engineer, Jal Nigam (retired). Mother: Retired teacher. One brother, software engineer in Pune.',
  'Father: Owns hardware shop since 1994. Mother: Homemaker. Two sisters, both married in the same community.',
];

const ADDRESSES = [
  'H. No. 214, Civil Lines, near Gandhi Park',
  'B-7, Prem Nagar Colony, Station Road',
  '112/3, Katghar, behind Shiv Mandir',
  'Ward 9, Lajpat Nagar, opposite SBI branch',
  'C-45, Deen Dayal Nagar, Phase 2',
];

// --- generation -------------------------------------------------------------

function gradientToken(): string {
  return `grad:${int(0, 359)}:${int(0, 359)}`;
}

function heightFor(gender: Gender): number {
  return gender === 'male' ? int(162, 185) : int(150, 172);
}

/** Band lower bounds are 30+3k, so any pick from these snaps onto a real band. */
function weightBandFor(gender: Gender): string {
  const lo = gender === 'male' ? 57 + 3 * int(0, 10) : 42 + 3 * int(0, 8);
  return `${lo}-${lo + 3}`;
}

function dobForAge(age: number): string {
  const d = new Date(DEMO_EPOCH);
  d.setUTCFullYear(d.getUTCFullYear() - age);
  d.setUTCMonth(int(0, 11), int(1, 28));
  return d.toISOString().slice(0, 10);
}

interface Seeded {
  profiles: Profile[];
  privates: ProfilePrivate[];
  requests: Request[];
  grants: Grant[];
  shortlists: Shortlist[];
  accounts: Account[];
}

function buildProfile(
  index: number,
  gender: Gender,
  fromHP: boolean,
): { profile: Profile; priv: ProfilePrivate } {
  const id = `p${String(index).padStart(3, '0')}`;
  const publicCode = `RSH-${100 + index}`;
  const rj = pick(fromHP ? HP_RELIGION_JATIS : PB_RELIGION_JATIS);
  const religion = rj.religion;
  const community = pick(rj.jatis);
  const category = pick(CATEGORIES);
  const city = pick(fromHP ? HP_PLACES : PB_PLACES);
  const edu = pick(EDUCATION);
  const occ = pick(OCCUPATIONS);
  const age = int(22, 34);
  const createdDaysAgo = int(1, 120);

  const profile: Profile = {
    id,
    publicCode,
    gender,
    dob: dobForAge(age),
    heightCm: heightFor(gender),
    weightBand: weightBandFor(gender),
    complexion: pick(COMPLEXIONS),
    education: edu.label,
    educationLevel: edu.level,
    occupation: occ.label,
    occupationCategory: occ.category,
    // Students and homemakers land on the floor band, not a made-up salary.
    incomeBand:
      occ.category === 'not_working' || occ.category === 'student'
        ? 'upto_15k'
        : pick(INCOME_BANDS),
    religion,
    category,
    community,
    state: city.state,
    district: city.district,
    city: city.city,
    village: pick(city.villages),
    cityLat: city.lat,
    cityLng: city.lng,
    maritalStatus: pick(MARITAL),
    diet: pick(DIETS),
    manglik: pick(MANGLIK),
    about: gender === 'male' ? pick(ABOUT_MALE) : pick(ABOUT_FEMALE),
    familyBrief: pick(FAMILY_BRIEF),
    status: 'active',
    isVerified: true,
    isSeed: true,
    createdAt: daysAgo(createdDaysAgo),
    lastActiveAt: daysAgo(int(0, Math.min(createdDaysAgo, 21))),
  };

  const first = gender === 'male' ? pick(MALE_FIRST) : pick(FEMALE_FIRST);
  const priv: ProfilePrivate = {
    profileId: id,
    fullName: `${first} ${pick(SURNAMES)}`,
    phone: `+919${int(100000000, 899999999)}`,
    photoUrls: Array.from({ length: int(1, 3) }, gradientToken),
    familyDetails: pick(FAMILY_DETAILS),
    exactAddress: `${pick(ADDRESSES)}, ${city.city}`,
  };

  return { profile, priv };
}

function seed(): Seeded {
  const profiles: Profile[] = [];
  const privates: ProfilePrivate[] = [];

  // Alternate genders so codes interleave the way a real register would.
  // 1-75 are Himachal families, 76-100 Punjab.
  for (let i = 1; i <= 100; i++) {
    const gender: Gender = i % 2 === 1 ? 'male' : 'female';
    const { profile, priv } = buildProfile(i, gender, i <= 75);
    profiles.push(profile);
    privates.push(priv);
  }

  // Admin-testable states. Chosen by index, not at random, so they stay put.
  // Profiles go live on submission (no review gate), so none start hidden;
  // eight are live without the optional verified badge.
  for (const id of ['p003', 'p016', 'p029', 'p007', 'p012', 'p021', 'p034', 'p038']) {
    profiles.find((x) => x.id === id)!.isVerified = false;
  }
  // One paused and one matched profile, so those states render somewhere.
  profiles.find((x) => x.id === 'p025')!.status = 'paused';
  profiles.find((x) => x.id === 'p030')!.status = 'matched';

  // The demo account: a parent with a son (p001) and a daughter (p002).
  // One household, so the two share religion, jati, category and place —
  // and sit in the register's majority community so the demo Matches tab
  // has something to show.
  {
    const son = profiles.find((x) => x.id === 'p001')!;
    const daughter = profiles.find((x) => x.id === 'p002')!;
    son.religion = 'hindu';
    son.community = 'Rajput';
    son.category = 'general';
    Object.assign(daughter, {
      religion: son.religion,
      community: son.community,
      category: son.category,
      state: son.state,
      district: son.district,
      city: son.city,
      village: son.village,
      cityLat: son.cityLat,
      cityLng: son.cityLng,
      familyBrief: son.familyBrief,
    });
  }
  const accounts: Account[] = [
    {
      id: 'acc-demo',
      phone: '+919876543210',
      createdAt: daysAgo(130),
      ownedProfileIds: ['p001', 'p002'],
      isSeed: true,
    },
  ];

  const requests: Request[] = [];
  const grants: Grant[] = [];

  const req = (
    n: number,
    from: string,
    to: string,
    type: Request['type'],
    status: Request['status'],
    message: string,
    createdD: number,
    respondedD: number | null,
  ): Request => ({
    id: `r${String(n).padStart(3, '0')}`,
    fromProfileId: from,
    toProfileId: to,
    type,
    status,
    message,
    createdAt: daysAgo(createdD),
    respondedAt: respondedD === null ? null : daysAgo(respondedD),
  });

  // --- Two pairs that have exchanged numbers, at different points --------
  //
  // Pair A: son p001 <-> p004. Both asked, both said yes — numbers open both ways.
  requests.push(
    req(1, 'p001', 'p004', 'contact', 'accepted', '', 15, 14),
    req(2, 'p004', 'p001', 'contact', 'accepted', '', 13, 12),
  );
  grants.push(
    {
      id: 'g001',
      granteeProfileId: 'p001',
      targetProfileId: 'p004',
      scope: 'contact',
      grantedAt: daysAgo(14),
      expiresAt: null,
      revokedAt: null,
    },
    {
      id: 'g002',
      granteeProfileId: 'p004',
      targetProfileId: 'p001',
      scope: 'contact',
      grantedAt: daysAgo(12),
      expiresAt: null,
      revokedAt: null,
    },
  );

  // Pair B: daughter p002 <-> p009. p009 asked and p002 said yes, so p009 has
  // her number; p002's own ask is still waiting on p009.
  requests.push(
    req(3, 'p009', 'p002', 'contact', 'accepted', '', 5, 4),
    req(4, 'p002', 'p009', 'contact', 'pending', '', 2, null),
  );
  grants.push({
    id: 'g003',
    granteeProfileId: 'p009',
    targetProfileId: 'p002',
    scope: 'contact',
    grantedAt: daysAgo(4),
    expiresAt: null,
    revokedAt: null,
  });

  // --- Five live requests, so both inbox tabs have content on first load ---
  requests.push(
    // Received by the son (p001) — needs a decision.
    req(10, 'p006', 'p001', 'contact', 'pending', '', 3, null),
    req(11, 'p014', 'p001', 'contact', 'pending', '', 1, null),
    // Received by the daughter (p002).
    req(12, 'p011', 'p002', 'contact', 'pending', '', 4, null),
    // Sent by the son, still waiting — withdrawable.
    req(13, 'p001', 'p008', 'contact', 'pending', '', 6, null),
    // Sent by the daughter and declined 5 days ago — 25 days of cooldown left.
    req(14, 'p002', 'p013', 'contact', 'declined', '', 8, 5),
  );

  const shortlists: Shortlist[] = [
    {
      id: 's001',
      ownerProfileId: 'p001',
      targetProfileId: 'p010',
      note: 'Same city, teacher. Mummy ko dikhana hai.',
      createdAt: daysAgo(7),
    },
    {
      id: 's002',
      ownerProfileId: 'p001',
      targetProfileId: 'p018',
      note: '',
      createdAt: daysAgo(2),
    },
    {
      id: 's003',
      ownerProfileId: 'p002',
      targetProfileId: 'p015',
      note: 'Government job, family bhi theek lag rahi hai.',
      createdAt: daysAgo(5),
    },
  ];

  return { profiles, privates, requests, grants, shortlists, accounts };
}

/**
 * Frozen seed snapshot. `createSeedData()` returns a deep copy so the store can
 * mutate freely and "Reset demo data" can restore the original.
 */
const SEED = seed();

export function createSeedData(): Seeded {
  return structuredClone(SEED);
}

export const DEMO_ACCOUNT_PHONE = '+919876543210';

/**
 * Display strings. English primary, Hindi secondary — the audience reads Hindi
 * more comfortably than English, but the printed biodata they already use is in
 * English, so English stays the primary line and Hindi supports it.
 *
 * Every label a parent has to act on lives here, not inline in a component, so
 * the same action keeps the same word across every screen.
 */

import type {
  ConnectionStage,
  Religion,
  Diet,
  EducationLevel,
  Gender,
  IncomeBand,
  Complexion,
  Manglik,
  MaritalStatus,
  OccupationCategory,
  ProfileStatus,
  Profile,
  RequestType,
  SocialCategory,
} from '@/types'

export interface Bi {
  en: string
  hi: string
}

export const MARITAL_LABELS: Record<MaritalStatus, Bi> = {
  never_married: {en: 'Never married', hi: 'अविवाहित'},
  divorced: {en: 'Divorced', hi: 'तलाकशुदा'},
  widowed: {en: 'Widowed', hi: 'विधवा / विधुर'},
  annulled: {en: 'Marriage annulled', hi: 'विवाह रद्द'},
}

export const DIET_LABELS: Record<Diet, Bi> = {
  vegetarian: {en: 'Vegetarian', hi: 'शाकाहारी'},
  eggetarian: {en: 'Eggetarian', hi: 'अंडा खाते हैं'},
  non_vegetarian: {en: 'Non-vegetarian', hi: 'मांसाहारी'},
  jain_vegetarian: {en: 'Jain vegetarian', hi: 'जैन शाकाहारी'},
}

export const COMPLEXION_LABELS: Record<Complexion, Bi> = {
  very_fair: {en: 'Very fair', hi: 'बहुत गोरा रंग'},
  fair: {en: 'Fair', hi: 'गोरा रंग'},
  medium: {en: 'Medium', hi: 'साफ़ रंग'},
  wheatish: {en: 'Wheatish', hi: 'गेहुँआ रंग'},
  wheatish_brown: {en: 'Wheatish brown', hi: 'गेहुँआ साँवला'},
  dusky: {en: 'Dusky', hi: 'साँवला रंग'},
  dark: {en: 'Dark', hi: 'गहरा रंग'},
}

/** Swatch colours for the skin-tone picker — warm, believable, never clinical. */
export const COMPLEXION_SWATCH: Record<Complexion, string> = {
  very_fair: '#f6e0cc',
  fair: '#eeceac',
  medium: '#e2b98d',
  wheatish: '#cfa072',
  wheatish_brown: '#b28057',
  dusky: '#94623e',
  dark: '#71482c',
}

export const MANGLIK_LABELS: Record<Manglik, Bi> = {
  yes: {en: 'Manglik', hi: 'मांगलिक'},
  no: {en: 'Not manglik', hi: 'मांगलिक नहीं'},
  partial: {en: 'Partial manglik', hi: 'आंशिक मांगलिक'},
  unknown: {en: 'Not known', hi: 'पता नहीं'},
}

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, Bi> = {
  high_school: {en: 'School (10th / 12th)', hi: 'स्कूल'},
  diploma: {en: 'Diploma', hi: 'डिप्लोमा'},
  bachelors: {en: "Bachelor's degree", hi: 'स्नातक'},
  masters: {en: "Master's degree", hi: 'परास्नातक'},
  doctorate: {en: 'Ph.D.', hi: 'पी-एच.डी.'},
  professional: {en: 'Professional (MBBS, CA, LLB…)', hi: 'व्यावसायिक डिग्री'},
  teaching: {en: 'Teaching (JBT / B.Ed / TET / PAT)', hi: 'शिक्षक (JBT / B.Ed / TET / PAT)'},
  other: {en: 'Other', hi: 'अन्य'},
}

/**
 * Card-length version of the education level. The dropdown label spells out
 * examples ("Professional (MBBS, CA, LLB…)"); a browse card has no room for
 * that, and this is what a family would say out loud anyway.
 */
export const EDUCATION_SHORT: Record<EducationLevel, string> = {
  high_school: '12th pass',
  diploma: 'Diploma',
  bachelors: 'Graduate',
  masters: 'Post graduate',
  doctorate: 'Ph.D.',
  professional: 'Professional degree',
  teaching: 'B.Ed / TET qualified',
  other: 'Other',
}

/** Job type. Six options, ordered the way families rank them locally. */
export const OCCUPATION_LABELS: Record<OccupationCategory, Bi> = {
  government: {en: 'Government job', hi: 'सरकारी नौकरी'},
  private_job: {en: 'Private job', hi: 'प्राइवेट नौकरी'},
  business: {en: 'Business', hi: 'व्यवसाय'},
  self_employed: {en: 'Self employed', hi: 'स्वरोज़गार'},
  student: {en: 'Studying / preparing', hi: 'पढ़ाई / तैयारी'},
  not_working: {en: 'Not working', hi: 'कार्यरत नहीं'},
}

/**
 * Monthly, not yearly. The "/ month" is baked into the label because these
 * strings also appear alone on a browse card, with no field name beside them.
 */
export const INCOME_LABELS: Record<IncomeBand, Bi> = {
  upto_15k: {en: 'Up to ₹15,000 / month', hi: '₹15,000 तक (मासिक)'},
  '15k_25k': {en: '₹15,000–25,000 / month', hi: '₹15,000–25,000 मासिक'},
  '25k_35k': {en: '₹25,000–35,000 / month', hi: '₹25,000–35,000 मासिक'},
  '35k_45k': {en: '₹35,000–45,000 / month', hi: '₹35,000–45,000 मासिक'},
  '45k_55k': {en: '₹45,000–55,000 / month', hi: '₹45,000–55,000 मासिक'},
  '55k_65k': {en: '₹55,000–65,000 / month', hi: '₹55,000–65,000 मासिक'},
  '65k_75k': {en: '₹65,000–75,000 / month', hi: '₹65,000–75,000 मासिक'},
  '75k_85k': {en: '₹75,000–85,000 / month', hi: '₹75,000–85,000 मासिक'},
  '85k_1l': {en: '₹85,000–1 lakh / month', hi: '₹85,000–1 लाख मासिक'},
  above_1l: {en: 'Above ₹1 lakh / month', hi: '₹1 लाख से अधिक (मासिक)'},
}

/**
 * Card-length income. The full label ("₹25,000–35,000 / month") wraps onto two
 * lines in a browse card's metadata row at 360px; this says the same thing on
 * one line. "/ month" is kept — dropping it is what makes a family misread a
 * monthly figure as a yearly one.
 */
export const INCOME_SHORT: Record<IncomeBand, string> = {
  upto_15k: 'Up to ₹15k / month',
  '15k_25k': '₹15–25k / month',
  '25k_35k': '₹25–35k / month',
  '35k_45k': '₹35–45k / month',
  '45k_55k': '₹45–55k / month',
  '55k_65k': '₹55–65k / month',
  '65k_75k': '₹65–75k / month',
  '75k_85k': '₹75–85k / month',
  '85k_1l': '₹85k–1 lakh / month',
  above_1l: 'Above ₹1 lakh / month',
}

export const STATUS_LABELS: Record<ProfileStatus, Bi> = {
  pending_review: {en: 'Under review', hi: 'जाँच जारी है'},
  active: {en: 'Live', hi: 'चालू'},
  paused: {en: 'Paused', hi: 'रोका हुआ'},
  matched: {en: 'Match found', hi: 'रिश्ता तय'},
}

export const GENDER_LABELS: Record<Gender, Bi> = {
  male: {en: 'Boy', hi: 'लड़का'},
  female: {en: 'Girl', hi: 'लड़की'},
}

export const CATEGORY_LABELS: Record<SocialCategory, Bi> = {
  general: {en: 'General', hi: 'सामान्य'},
  obc: {en: 'OBC', hi: 'ओबीसी'},
  sc: {en: 'SC', hi: 'एससी'},
  st: {en: 'ST', hi: 'एसटी'},
}

export const RELIGION_LABELS: Record<Religion, Bi> = {
  hindu: {en: 'Hindu', hi: 'हिंदू'},
  muslim: {en: 'Muslim', hi: 'मुस्लिम'},
  sikh: {en: 'Sikh', hi: 'सिख'},
  christian: {en: 'Christian', hi: 'ईसाई'},
  jain: {en: 'Jain', hi: 'जैन'},
  buddhist: {en: 'Buddhist', hi: 'बौद्ध'},
  other: {en: 'Other', hi: 'अन्य'},
}

/** The single source of truth for action wording. Reused on every screen. */
export const ACTIONS = {
  sendInterest: {en: 'Send interest', hi: 'रुचि भेजें'},
  withdrawInterest: {en: 'Take back interest', hi: 'रुचि वापस लें'},
  accept: {en: 'Accept interest', hi: 'रुचि स्वीकार करें'},
  decline: {en: 'Decline', hi: 'मना करें'},
  askPhoto: {en: 'Ask for photo', hi: 'फ़ोटो माँगें'},
  sharePhoto: {en: 'Share my photo', hi: 'अपनी फ़ोटो साझा करें'},
  askContact: {en: 'Request number', hi: 'नंबर माँगें'},
  withdrawRequest: {en: 'Take back request', hi: 'निवेदन वापस लें'},
  shareContact: {en: 'Share my number', hi: 'अपना नंबर साझा करें'},
  save: {en: 'Save profile', hi: 'प्रोफ़ाइल सहेजें'},
  unsave: {en: 'Remove from saved', hi: 'सहेजी सूची से हटाएँ'},
  revoke: {en: 'Take back access', hi: 'पहुँच वापस लें'},
  report: {en: 'Report this profile', hi: 'शिकायत करें'},
  applyFilters: {en: 'Show profiles', hi: 'प्रोफ़ाइल दिखाएँ'},
  clearFilters: {en: 'Clear all filters', hi: 'सभी फ़िल्टर हटाएँ'},
} as const satisfies Record<string, Bi>

export const STAGE_LABELS: Record<ConnectionStage, Bi> = {
  browsing: {en: 'Not contacted', hi: 'संपर्क नहीं'},
  request_sent: {en: 'Number requested', hi: 'नंबर माँगा है'},
  request_received: {en: 'Asked for your number', hi: 'आपका नंबर माँगा है'},
  number_shared: {en: 'Number shared', hi: 'नंबर मिल गया'},
  declined_by_them: {en: 'They declined', hi: 'उन्होंने मना किया'},
  declined_by_me: {en: 'You declined', hi: 'आपने मना किया'},
}

export const REQUEST_TYPE_LABELS: Record<RequestType, Bi> = {
  interest: {en: 'Interest', hi: 'रुचि'},
  photo: {en: 'Photo', hi: 'फ़ोटो'},
  contact: {en: 'Phone number', hi: 'फ़ोन नंबर'},
}

/**
 * Weight bands: 3 kg steps from 30 up to 140. The last band is 2 kg wide
 * because 30 + 3n lands on 138, and 140 is the ceiling that was asked for.
 */
export const WEIGHT_BANDS: string[] = Array.from({length: 37}, (_, i) => {
  const lo = 30 + i * 3
  return `${lo}-${lo === 138 ? 140 : lo + 3}`
})

/** "54-57" -> "54–57 kg" */
export function formatWeightBand(band: string): string {
  return `${band.replace('-', '–')} kg`
}

// --- formatters -------------------------------------------------------------

/** 168 -> 5'6" (168 cm). Families quote feet and inches, so that comes first. */
export function formatHeight(cm: number): string {
  const totalInches = Math.round(cm / 2.54)
  const feet = Math.floor(totalInches / 12)
  const inches = totalInches % 12
  return `${feet}'${inches}" (${cm} cm)`
}

/**
 * Height dropdown options, one per inch from 4'8" to 6'2". Built from inches,
 * not from cm, because stepping by 1 cm produced the same inch label twice
 * (2.54 cm per inch) and the list showed duplicates.
 */
export const HEIGHT_OPTIONS: Array<{cm: number; label: string}> = Array.from(
  {length: 74 - 56 + 1},
  (_, i) => {
    const inches = 56 + i
    const cm = Math.round(inches * 2.54)
    return {cm, label: `${Math.floor(inches / 12)}'${inches % 12}"`}
  },
)

export function formatHeightShort(cm: number): string {
  const totalInches = Math.round(cm / 2.54)
  return `${Math.floor(totalInches / 12)}'${totalInches % 12}"`
}

/** "2 days ago" style, in words a non-fluent English reader can parse. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return `${months} month${months === 1 ? '' : 's'} ago`
}

export function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
}

/**
 * "grad:340:26" -> a CSS gradient. Deterministic per profile, and blurred at
 * render time. Never resembles a face — that is the point.
 */
export function gradientFromToken(token: string): string {
  const [, a = '210', b = '260'] = token.split(':')
  return `linear-gradient(135deg, hsl(${a} 45% 62%), hsl(${b} 38% 40%))`
}

// --- Hindi one-paragraph biodata --------------------------------------------

/** "48-51" -> "48–51" */
function hiBand(band: string): string {
  return band.replace('-', '–')
}

/** INCOME_LABELS.hi without its trailing "मासिक" — the sentence supplies that word. */
function hiIncome(band: IncomeBand): string {
  return INCOME_LABELS[band].hi.replace(' (मासिक)', '').replace(' मासिक', '')
}

/**
 * The public biodata as one short Hindi paragraph, the way a relative would
 * read it out over the phone. `shown` lists the facts the card has already
 * printed above the paragraph (keys from the card's fact list plus 'age',
 * 'height', 'city'); those are left out so nothing is said twice. Whatever
 * remains is grouped into at most three sentences — who they are, their
 * work, their looks — and a group with nothing left in it is dropped.
 *
 * Education, job type, category and marital status stay in English inside
 * the Hindi sentence ("Post graduate", "Government job", "SC category",
 * "Unmarried") because that is how families actually say them.
 */
export function describeProfileHindi(
  p: Profile,
  age: number,
  shown: ReadonlySet<string> = new Set(),
): string {
  const girl = p.gender === 'female'
  const who = girl ? 'लड़की' : 'लड़का'
  const ki = girl ? 'की' : 'का'
  const v = (f: string, m: string) => (girl ? f : m) // verb ending by gender
  const has = (k: string) => !shown.has(k)

  // 1. Who they are: place / age, religion & jati, category, marital, manglik.
  const whoParts: string[] = []
  if (has('city')) whoParts.push(`${p.city} (${p.district}) से हैं`)
  if (has('religion') && has('category')) {
    whoParts.push(`${RELIGION_LABELS[p.religion].hi} ${p.community} परिवार, ${CATEGORY_LABELS[p.category].en} category से हैं`)
  } else if (has('religion')) {
    whoParts.push(`${RELIGION_LABELS[p.religion].hi} ${p.community} परिवार से हैं`)
  } else if (has('category')) {
    whoParts.push(`${CATEGORY_LABELS[p.category].en} category से हैं`)
  }
  const marital: Record<MaritalStatus, string> = {
    never_married: 'Unmarried',
    divorced: 'Divorced',
    widowed: 'Widowed',
    annulled: 'Marriage annulled',
  }
  if (has('marital')) whoParts.push(`${marital[p.maritalStatus]} हैं`)
  const manglik: Record<Manglik, string> = {
    yes: 'मांगलिक हैं',
    no: 'मांगलिक नहीं हैं',
    partial: 'आंशिक मांगलिक हैं',
    unknown: 'मांगलिक की जानकारी नहीं है',
  }
  if (has('manglik')) whoParts.push(manglik[p.manglik])
  const subject = has('age') ? `यह ${who} ${age} साल ${ki} है` : `यह ${who}`
  const whoSentence = whoParts.length
    ? `${subject}${has('age') ? ', ' : ' '}${whoParts.join(', ')}।`
    : has('age')
      ? `${subject}।`
      : ''

  // 2. Work: education, job type, income.
  const workParts: string[] = []
  if (has('education')) {
    const edu = p.educationLevel === 'other' ? p.education : EDUCATION_SHORT[p.educationLevel]
    workParts.push(`पढ़ाई ${edu}`)
  }
  const job: Record<OccupationCategory, string> = {
    government: `Government job ${v('करती', 'करते')} हैं`,
    private_job: `Private job ${v('करती', 'करते')} हैं`,
    business: `अपना Business ${v('करती', 'करते')} हैं`,
    self_employed: 'Self employed हैं',
    student: 'अभी Student हैं',
    not_working: `अभी काम नहीं कर ${v('रही', 'रहे')} हैं`,
  }
  if (has('job')) workParts.push(job[p.occupationCategory])
  const earns = p.occupationCategory !== 'not_working' && p.occupationCategory !== 'student'
  if (has('income') && earns) workParts.push(`मासिक आय ${hiIncome(p.incomeBand)} है`)
  const workSentence = workParts.length ? `${workParts.join(', ')}।` : ''

  // 3. Looks: height, weight, complexion.
  const lookParts: string[] = []
  if (has('height')) lookParts.push(`कद ${formatHeightShort(p.heightCm)}`)
  if (has('weight')) lookParts.push(`वज़न ${hiBand(p.weightBand)} किलो`)
  if (has('skin')) lookParts.push(COMPLEXION_LABELS[p.complexion].hi)
  const lookSentence = lookParts.length ? `${lookParts.join(', ')}।` : ''

  return [whoSentence, workSentence, lookSentence].filter(Boolean).join(' ')
}

/**
 * India location data + geo helpers.
 *
 * State → city, the way an Indian address is actually said. The city list is
 * real data — 4,198 cities and towns across all 36 states/UTs, extracted from
 * the open countries-states-cities database (the same tables Google Places
 * would resolve against), each with town-centre coordinates. It ships as a
 * 110 KB static asset (`/india-cities.json`) and is fetched lazily the first
 * time a city field needs it, so it costs nothing on normal page loads.
 *
 * This whole module is the Google Places stand-in. When a real Places key
 * exists, `searchCitiesInState` becomes an API call and everything else —
 * the stored { state, city, lat, lng } shape, the radius filter, every
 * component — stays exactly as it is. True village-level coverage (below
 * census-town size) arrives with that swap; this dataset covers cities and
 * tehsil towns.
 */

export interface City {
  name: string;
  state: string;
  lat: number;
  lng: number;
}

/** All 36 states + union territories, for the state dropdown. */
export const INDIA_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

/** Compact wire format: { "State": [["City", lat, lng], ...] } */
type Dataset = Record<string, Array<[string, number, number]>>;

let datasetPromise: Promise<Dataset> | null = null;

function loadDataset(): Promise<Dataset> {
  if (!datasetPromise) {
    datasetPromise = fetch('/india-cities.json').then((r) => {
      if (!r.ok) {
        datasetPromise = null; // let a later call retry
        throw new Error('city dataset failed to load');
      }
      return r.json() as Promise<Dataset>;
    });
  }
  return datasetPromise;
}

export async function getCitiesOfState(state: string): Promise<City[]> {
  const data = await loadDataset();
  return (data[state] ?? []).map(([name, lat, lng]) => ({ name, state, lat, lng }));
}

/**
 * The Places-autocomplete stand-in: search within one state. Prefix matches
 * rank above substring matches, the way a parent typing "mor" expects
 * Moradabad first.
 */
export async function searchCitiesInState(
  state: string,
  query: string,
  limit = 6,
): Promise<City[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const cities = await getCitiesOfState(state);
  const starts: City[] = [];
  const contains: City[] = [];
  for (const c of cities) {
    const name = c.name.toLowerCase();
    if (name.startsWith(q)) starts.push(c);
    else if (name.includes(q)) contains.push(c);
  }
  return [...starts, ...contains].slice(0, limit);
}

// ---------------------------------------------------------------------------
// Administrative hierarchy: State → District → Tehsil
// ---------------------------------------------------------------------------

/**
 * Official Census/LGD rural hierarchy — 36 states, 666 districts, 5,996
 * tehsils — served as /india-admin.json (76 KB, lazy-fetched like the city
 * list). Villages sit below this and are free text until a Places key exists.
 */
type AdminDataset = Record<string, Record<string, string[]>>;

let adminPromise: Promise<AdminDataset> | null = null;

function loadAdmin(): Promise<AdminDataset> {
  if (!adminPromise) {
    adminPromise = fetch('/india-admin.json').then((r) => {
      if (!r.ok) {
        adminPromise = null; // let a later call retry
        throw new Error('admin dataset failed to load');
      }
      return r.json() as Promise<AdminDataset>;
    });
  }
  return adminPromise;
}

export async function getDistricts(state: string): Promise<string[]> {
  const data = await loadAdmin();
  return Object.keys(data[state] ?? {});
}

export async function getTehsils(state: string, district: string): Promise<string[]> {
  const data = await loadAdmin();
  return data[state]?.[district] ?? [];
}

/**
 * Coordinates for a tehsil, best-effort: the tehsil town in the state's city
 * list, else the district HQ town, else the centroid of the state's cities.
 * Tehsil towns and district HQs are almost always in the 4,198-city list, so
 * the radius filter stays honest without a dedicated tehsil-coordinate table.
 */
export async function resolveCoords(
  state: string,
  tehsil: string,
  district: string,
): Promise<{ lat: number; lng: number }> {
  const cities = await getCitiesOfState(state);
  if (!cities.length) return { lat: 22.6, lng: 79.4 }; // geographic centre of India
  const find = (name: string) => {
    const n = name.trim().toLowerCase();
    return cities.find((c) => c.name.toLowerCase() === n)
      ?? cities.find((c) => c.name.toLowerCase().startsWith(n) || n.startsWith(c.name.toLowerCase()));
  };
  const hit = find(tehsil) ?? find(district);
  if (hit) return { lat: hit.lat, lng: hit.lng };
  const lat = cities.reduce((s, c) => s + c.lat, 0) / cities.length;
  const lng = cities.reduce((s, c) => s + c.lng, 0) / cities.length;
  return { lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000 };
}

/** Great-circle distance, rounded to whole km — all a radius filter needs. */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

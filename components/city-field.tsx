'use client';

/**
 * State → District → Tehsil picker, the way a rural Indian address is
 * actually said. Village/mohalla is a separate free-text field below this.
 *
 * All three levels are dropdowns over the official Census/LGD hierarchy
 * (36 states → 666 districts → 5,996 tehsils), lazy-fetched from
 * /india-admin.json. Picking a tehsil resolves its coordinates from the city
 * dataset (tehsil town, else district HQ, else state centroid) — that is
 * what the radius filter runs on.
 *
 * This component is the Google Places stand-in. With a real Places key the
 * option lists and geocoding become API calls; callers keep receiving
 * { state, district, tehsil, lat, lng }.
 */

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { INDIA_STATES, getDistricts, getTehsils, resolveCoords } from '@/lib/cities';
import { Select } from './ui';

export interface PickedPlace {
  state: string;
  district: string;
  tehsil: string;
  lat: number;
  lng: number;
}

export function StateDistrictTehsilField({
  value,
  onChange,
  error,
}: {
  value: PickedPlace | null;
  onChange: (place: PickedPlace | null) => void;
  error?: string | null;
}) {
  const [state, setState] = useState(value?.state ?? '');
  const [district, setDistrict] = useState(value?.district ?? '');
  const [tehsil, setTehsil] = useState(value?.tehsil ?? '');
  const [districts, setDistricts] = useState<string[]>([]);
  const [tehsils, setTehsils] = useState<string[]>([]);
  const [resolving, setResolving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!state) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    getDistricts(state)
      .then((d) => {
        if (!cancelled) {
          setDistricts(d);
          setLoadFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [state]);

  useEffect(() => {
    if (!state || !district) {
      setTehsils([]);
      return;
    }
    let cancelled = false;
    getTehsils(state, district)
      .then((t) => {
        if (!cancelled) {
          setTehsils(t);
          setLoadFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [state, district]);

  async function pickTehsil(t: string) {
    setTehsil(t);
    if (!t) {
      onChange(null);
      return;
    }
    setResolving(true);
    try {
      const { lat, lng } = await resolveCoords(state, t, district);
      onChange({ state, district, tehsil: t, lat, lng });
    } catch {
      setLoadFailed(true);
      onChange(null);
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Select
        label="State"
        hindi="राज्य"
        value={state}
        onChange={(e) => {
          setState(e.target.value);
          setDistrict('');
          setTehsil('');
          if (value) onChange(null);
        }}
      >
        <option value="">Choose state / राज्य चुनें</option>
        {INDIA_STATES.map((st) => (
          <option key={st} value={st}>
            {st}
          </option>
        ))}
      </Select>

      <Select
        label="District"
        hindi="ज़िला"
        value={district}
        disabled={!state}
        onChange={(e) => {
          setDistrict(e.target.value);
          setTehsil('');
          if (value) onChange(null);
        }}
        hint={!state ? 'Choose the state first / पहले राज्य चुनें' : undefined}
      >
        <option value="">Choose district / ज़िला चुनें</option>
        {districts.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </Select>

      <Select
        label="Tehsil"
        hindi="तहसील"
        value={tehsil}
        disabled={!district}
        onChange={(e) => void pickTehsil(e.target.value)}
        error={error}
        hint={!district ? 'Choose the district first / पहले ज़िला चुनें' : undefined}
      >
        <option value="">Choose tehsil / तहसील चुनें</option>
        {tehsils.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </Select>

      {resolving ? (
        <p className="flex items-center gap-1.5 text-sm text-ink-3">
          <MapPin size={15} aria-hidden />
          Finding this tehsil on the map…
        </p>
      ) : null}
      {loadFailed ? (
        <p className="rounded-lg border-2 border-oxide/40 bg-oxide-wash px-3 py-2.5 text-sm font-medium text-oxide">
          Could not load the area list. Check your connection and choose again.
        </p>
      ) : null}
    </div>
  );
}

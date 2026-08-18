/**
 * The mock "database".
 *
 * This is a flat, normalised store that mirrors the future Postgres tables —
 * no derived state, no view models, no business rules. All of that lives in
 * lib/api.ts. Keeping this dumb is what makes the Supabase swap a one-file job:
 * delete this, point api.ts at the client, and no component changes.
 *
 * IMPORTANT: components must never import this file. Import lib/api.ts.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSeedData } from './mock-data';
import type {
  Account,
  Grant,
  Profile,
  ProfilePrivate,
  Request,
  Session,
  Shortlist,
} from '@/types';

/**
 * Bump both when the seed or table shape changes — a browser holding rows from
 * an older shape (v1 stored yearly income bands, v2 coarser monthly ones) must
 * start clean rather than render values no label map knows about.
 */
const STORE_VERSION = 10;
const STORAGE_KEY = 'rishta-db-v10';

export interface Tables {
  accounts: Account[];
  profiles: Profile[];
  profilePrivates: ProfilePrivate[];
  requests: Request[];
  grants: Grant[];
  shortlists: Shortlist[];
}

export interface DbState extends Tables {
  session: Session;
  /** Monotonic counter for generated row ids — keeps them readable in devtools. */
  nextId: number;

  // --- writes. Named after the SQL they will become. -----------------------
  setSession: (session: Session) => void;
  insertProfile: (profile: Profile, priv: ProfilePrivate, accountId: string) => void;
  updateProfile: (id: string, patch: Partial<Profile>) => void;
  updateProfilePrivate: (profileId: string, patch: Partial<ProfilePrivate>) => void;
  insertRequest: (request: Request) => void;
  updateRequest: (id: string, patch: Partial<Request>) => void;
  insertGrant: (grant: Grant) => void;
  updateGrant: (id: string, patch: Partial<Grant>) => void;
  insertShortlist: (shortlist: Shortlist) => void;
  updateShortlist: (id: string, patch: Partial<Shortlist>) => void;
  deleteShortlist: (id: string) => void;
  upsertAccount: (account: Account) => void;
  /** Returns a fresh row id, e.g. "r041". */
  takeId: (prefix: string) => string;
  /** Dev-only: wipe everything back to the seed snapshot. */
  resetDemoData: () => void;
}

function initialTables(): Tables {
  const s = createSeedData();
  return {
    accounts: s.accounts,
    profiles: s.profiles,
    profilePrivates: s.privates,
    requests: s.requests,
    grants: s.grants,
    shortlists: s.shortlists,
  };
}

const EMPTY_SESSION: Session = {
  accountId: null,
  phone: null,
  activeProfileId: null,
};

export const useDb = create<DbState>()(
  persist(
    (set, get) => ({
      ...initialTables(),
      session: EMPTY_SESSION,
      nextId: 1000,

      setSession: (session) => set({ session }),

      insertProfile: (profile, priv, accountId) =>
        set((s) => ({
          profiles: [...s.profiles, profile],
          profilePrivates: [...s.profilePrivates, priv],
          accounts: s.accounts.map((a) =>
            a.id === accountId
              ? { ...a, ownedProfileIds: [...a.ownedProfileIds, profile.id] }
              : a,
          ),
        })),

      updateProfile: (id, patch) =>
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      updateProfilePrivate: (profileId, patch) =>
        set((s) => ({
          profilePrivates: s.profilePrivates.map((p) =>
            p.profileId === profileId ? { ...p, ...patch } : p,
          ),
        })),

      insertRequest: (request) => set((s) => ({ requests: [...s.requests, request] })),

      updateRequest: (id, patch) =>
        set((s) => ({
          requests: s.requests.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      insertGrant: (grant) => set((s) => ({ grants: [...s.grants, grant] })),

      updateGrant: (id, patch) =>
        set((s) => ({
          grants: s.grants.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),

      insertShortlist: (shortlist) =>
        set((s) => ({ shortlists: [...s.shortlists, shortlist] })),

      updateShortlist: (id, patch) =>
        set((s) => ({
          shortlists: s.shortlists.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),

      deleteShortlist: (id) =>
        set((s) => ({ shortlists: s.shortlists.filter((x) => x.id !== id) })),

      upsertAccount: (account) =>
        set((s) => ({
          accounts: s.accounts.some((a) => a.id === account.id)
            ? s.accounts.map((a) => (a.id === account.id ? account : a))
            : [...s.accounts, account],
        })),

      takeId: (prefix) => {
        const n = get().nextId;
        set({ nextId: n + 1 });
        return `${prefix}${n}`;
      },

      resetDemoData: () =>
        set({ ...initialTables(), session: EMPTY_SESSION, nextId: 1000 }),
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      // Only rows and session persist; actions are recreated on every load.
      partialize: (s) => ({
        accounts: s.accounts,
        profiles: s.profiles,
        profilePrivates: s.profilePrivates,
        requests: s.requests,
        grants: s.grants,
        shortlists: s.shortlists,
        session: s.session,
        nextId: s.nextId,
      }),
    },
  ),
);

/** Snapshot read for api.ts — never subscribes, so it is safe outside React. */
export const db = () => useDb.getState();

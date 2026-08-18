'use client';

/**
 * App-wide client context. Both providers talk to lib/api.ts only — neither
 * imports the store, so both survive the Supabase swap untouched.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import * as api from '@/lib/api';
import type { Profile } from '@/types';
import { cx } from './ui';

// --- Toasts -----------------------------------------------------------------

type ToastTone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

const ToastCtx = createContext<{ push: (tone: ToastTone, message: string) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <AppProviders>');
  return ctx;
}

function ToastHost({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  const icons = {
    success: <CheckCircle2 size={20} aria-hidden />,
    error: <TriangleAlert size={20} aria-hidden />,
    info: <Info size={20} aria-hidden />,
  };
  const tones = {
    success: 'border-seal bg-seal-wash text-seal',
    error: 'border-oxide bg-oxide-wash text-oxide',
    info: 'border-stamp bg-stamp-wash text-stamp-ink',
  };
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[76px] z-[60] flex flex-col items-center gap-2 px-3 md:bottom-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            'pointer-events-auto flex w-full max-w-md items-start gap-2 border-2 px-3 py-2.5 text-[15px] font-medium shadow-sm',
            tones[t.tone],
          )}
          style={{ animation: 'rishta-fade-in 160ms ease-out' }}
        >
          <span className="mt-0.5 shrink-0">{icons[t.tone]}</span>
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss message"
            className="shrink-0 p-1"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}

// --- Session ----------------------------------------------------------------

interface SessionValue {
  /** null while the persisted store is still hydrating on first paint. */
  ready: boolean;
  isSignedIn: boolean;
  activeProfile: Profile | null;
  myProfiles: Profile[];
  pending: { received: number; sent: number };
  refresh: () => Promise<void>;
}

const SessionCtx = createContext<SessionValue | null>(null);

export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error('useSession must be used inside <AppProviders>');
  return ctx;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ready, setReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [myProfiles, setMyProfiles] = useState<Profile[]>([]);
  const [pending, setPending] = useState({ received: 0, sent: 0 });

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, tone, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refresh = useCallback(async () => {
    const session = await api.getSession();
    setIsSignedIn(Boolean(session.accountId));
    if (!session.accountId) {
      setActiveProfile(null);
      setMyProfiles([]);
      setPending({ received: 0, sent: 0 });
      setReady(true);
      return;
    }
    const [profiles, active] = await Promise.all([api.getMyProfiles(), api.getActiveProfile()]);
    setMyProfiles(profiles);
    setActiveProfile(active);
    setPending(active ? await api.getPendingCounts() : { received: 0, sent: 0 });
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toastValue = useMemo(() => ({ push }), [push]);
  const sessionValue = useMemo<SessionValue>(
    () => ({ ready, isSignedIn, activeProfile, myProfiles, pending, refresh }),
    [ready, isSignedIn, activeProfile, myProfiles, pending, refresh],
  );

  return (
    <ToastCtx.Provider value={toastValue}>
      <SessionCtx.Provider value={sessionValue}>
        {children}
        <ToastHost toasts={toasts} dismiss={dismiss} />
      </SessionCtx.Provider>
    </ToastCtx.Provider>
  );
}

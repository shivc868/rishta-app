'use client';

/**
 * Light / Dark / Phone's choice. Lives in Settings; the pick is remembered in
 * this browser and applied before first paint by the script in app/layout.tsx.
 */

import { useEffect, useState } from 'react';
import { Moon, Smartphone, Sun } from 'lucide-react';
import { applyTheme, readTheme, type ThemeChoice } from '@/lib/theme';
import { cx } from '@/lib/cx';

const OPTIONS: Array<{ key: ThemeChoice; en: string; hi: string; icon: typeof Sun }> = [
  { key: 'light', en: 'Light', hi: 'हल्का', icon: Sun },
  { key: 'dark', en: 'Dark', hi: 'गहरा', icon: Moon },
  { key: 'system', en: 'Phone', hi: 'फ़ोन जैसा', icon: Smartphone },
];

export function ThemeSwitch() {
  const [choice, setChoice] = useState<ThemeChoice>('light');

  useEffect(() => setChoice(readTheme()), []);

  function pick(next: ThemeChoice) {
    setChoice(next);
    applyTheme(next);
  }

  return (
    <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-1 rounded-xl bg-paper p-1 ring-1 ring-inset ring-rule-strong">
      {OPTIONS.map((o) => {
        const active = choice === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => pick(o.key)}
            className={cx(
              'tap flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 text-[14px] font-semibold transition-all duration-150',
              active
                ? 'bg-card text-stamp shadow-[var(--shadow-e1)] ring-1 ring-inset ring-stamp-ring'
                : 'text-ink-2 hover:text-ink',
            )}
          >
            <o.icon size={18} aria-hidden />
            {o.en}
            <span className={cx('hindi font-normal', active ? 'text-stamp/80' : 'text-ink-3')}>{o.hi}</span>
          </button>
        );
      })}
    </div>
  );
}

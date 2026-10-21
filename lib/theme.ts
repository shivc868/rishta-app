/**
 * Light / dark / follow-the-phone.
 *
 * The choice lives in localStorage and is applied as `data-theme` on <html>.
 * The DEFAULT is light: the wedding-card look is the product, and it must be
 * the same on every phone regardless of the phone's own dark-mode setting.
 * Dark, or following the phone, is only ever what a family picked in Settings.
 */

export type ThemeChoice = 'light' | 'dark' | 'system';

export const THEME_KEY = 'rishta-theme';

/**
 * Runs inline in <head> so the first paint is already the right colour. The
 * server renders data-theme="light"; this only changes it when the family
 * explicitly chose dark or "phone's choice".
 */
export const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark')}else if(t==='system'){document.documentElement.removeAttribute('data-theme')}}catch(e){}})();`;

export function readTheme(): ThemeChoice {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'dark' || t === 'system' ? t : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
  try {
    // Every choice is stored, including "system", because the absence of a
    // stored choice means light, not system.
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Private window or blocked storage: the attribute still applies for this page.
  }
}

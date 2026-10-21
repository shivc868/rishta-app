/**
 * Joins class names, dropping falsy parts. Lives outside components/ui.tsx
 * (a client module) so Server Components can call it too.
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

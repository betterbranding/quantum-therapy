/**
 * Local, device-side count of completed sessions.
 *
 * Used to drive two onboarding moments that must work before an account exists:
 *   - The inline "headphones required" prompt, shown only until the first
 *     session completes (Progressive Disclosure: stop nagging veterans).
 *   - The first-session Success Moment.
 *
 * This is deliberately separate from the authoritative Supabase session count,
 * which enforces the free-tier limit. This counter only decides UI, never
 * billing, so a cleared browser simply shows the welcome affordances again.
 */

const KEY = "qt.completed.v1";

export function completedCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const n = Number(window.localStorage.getItem(KEY));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Record a completed session. Returns the new total. */
export function recordCompletion(): number {
  if (typeof window === "undefined") return 0;
  try {
    const next = completedCount() + 1;
    window.localStorage.setItem(KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

export function hasCompletedASession(): boolean {
  return completedCount() > 0;
}

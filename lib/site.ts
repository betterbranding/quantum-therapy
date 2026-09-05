const DEFAULT_SITE_URL = "https://quantumtherapy.app";

/**
 * Resolve the public site URL.
 *
 * Deliberately defensive: an env var that is present but blank (easy to do when
 * pasting into a hosting dashboard) must never crash the build. `??` only guards
 * against undefined, so empty strings used to reach `new URL("")` and throw
 * ERR_INVALID_URL during page-data collection.
 *
 * Order of preference:
 *   1. NEXT_PUBLIC_SITE_URL, if it parses as a URL
 *   2. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL, injected automatically by Vercel
 *   3. The canonical production domain
 */
export function getSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const raw of candidates) {
    const value = raw?.trim();
    if (!value) continue;

    const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;

    try {
      const parsed = new URL(withScheme);
      if (!parsed.hostname) continue;
      return parsed.origin;
    } catch {
      // Malformed value, try the next candidate.
    }
  }

  return DEFAULT_SITE_URL;
}

export const siteUrl = getSiteUrl();

/**
 * Protocol data access.
 *
 * Reads from Supabase when it is configured, and falls back to the bundled
 * data/protocols.json when it is not. That means the app runs correctly the
 * moment you clone it, before any database exists, and quietly upgrades to
 * server-side search once you paste in your Supabase keys.
 */

import raw from "@/data/protocols.json";
import { TONES } from "@/data/tones";
import type { Protocol, Tone } from "@/lib/supabase/types";

type RawProtocol = {
  slug: string;
  name: string;
  category: string;
  aliases: string[];
  frequencies: number[];
  notes: string;
  description: string;
};

const LOCAL: Protocol[] = (raw as RawProtocol[]).map((p, i) => ({
  id: i + 1,
  slug: p.slug,
  name: p.name,
  category: p.category,
  aliases: p.aliases,
  frequencies: p.frequencies,
  notes: p.notes || null,
  description: p.description || null,
  source: "CAFL",
  created_at: "",
}));

export const PROTOCOL_COUNT = LOCAL.length;
export const FREQUENCY_COUNT = LOCAL.reduce((a, p) => a + p.frequencies.length, 0);

export function localProtocols(): Protocol[] {
  return LOCAL;
}

export function categoryCounts(): { category: string; count: number }[] {
  const m = new Map<string, number>();
  for (const p of LOCAL) m.set(p.category, (m.get(p.category) ?? 0) + 1);
  return [...m.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Lightweight local scorer used as the fallback search. */
export function scoreLocal(query: string, limit = 40): Protocol[] {
  const q = query.trim().toLowerCase();
  if (!q) return LOCAL.slice(0, limit);

  const scored: { p: Protocol; s: number }[] = [];
  for (const p of LOCAL) {
    const name = p.name.toLowerCase();
    let s = 0;
    if (name === q) s = 1000;
    else if (name.startsWith(q)) s = 700 - name.length;
    else if (name.includes(q)) s = 450 - name.indexOf(q);
    else if (p.aliases.some((a) => a.toLowerCase().includes(q))) s = 300;
    else if ((p.notes ?? "").toLowerCase().includes(q)) s = 120;
    else if (p.category.toLowerCase().includes(q)) s = 80;
    if (s > 0) scored.push({ p, s });
  }
  scored.sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name));
  return scored.slice(0, limit).map((x) => x.p);
}

export function getLocalBySlug(slug: string): Protocol | null {
  return LOCAL.find((p) => p.slug === slug) ?? null;
}

export const LOCAL_TONES: Tone[] = TONES.map((t, i) => ({ ...t, sort_order: i }));

export function getLocalTone(id: string): Tone | null {
  return LOCAL_TONES.find((t) => t.id === id) ?? null;
}

/** Estimated session length in seconds at the given seconds-per-frequency. */
export function estimateDuration(p: Protocol, secondsPerFreq = 180): number {
  return p.frequencies.length * secondsPerFreq;
}

"use client";

/**
 * Personalised "Start here" list on the home page.
 *
 * The server passes a small pool of protocol summaries (every slug any intent
 * might feature). This picks the four that match the visitor's declared intent,
 * falling back to the default hand-picked set when none is stored. It updates
 * live when the intent screen fires "qt:intent", so choosing a goal reorders the
 * home page without a reload.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  DEFAULT_FEATURED_SLUGS,
  intentById,
  loadIntent,
  type IntentId,
} from "@/lib/intent";

export type FeaturedItem = {
  slug: string;
  name: string;
  category: string;
  freqCount: number;
};

export function IntentFeatured({ pool }: { pool: FeaturedItem[] }) {
  const [intent, setIntent] = useState<IntentId | null>(null);

  useEffect(() => {
    setIntent(loadIntent());
    const onIntent = (e: Event) => setIntent((e as CustomEvent<IntentId>).detail);
    window.addEventListener("qt:intent", onIntent);
    return () => window.removeEventListener("qt:intent", onIntent);
  }, []);

  const def = intentById(intent);
  const bySlug = new Map(pool.map((p) => [p.slug, p]));
  const slugs = def ? def.slugs : DEFAULT_FEATURED_SLUGS;
  const items = slugs
    .map((s) => bySlug.get(s))
    .filter((p): p is FeaturedItem => Boolean(p))
    .slice(0, 4);

  // Guard against an intent whose slugs are all missing from the pool.
  const shown = items.length
    ? items
    : DEFAULT_FEATURED_SLUGS.map((s) => bySlug.get(s)).filter(
        (p): p is FeaturedItem => Boolean(p),
      );

  return (
    <>
      <p className="t-label">{def ? `Tuned for ${def.label}` : "Start Here"}</p>
      <h2 className="t-display mt-2 text-[1.75rem] text-ink">
        {def && def.id !== "explore" ? "Made for you" : "Start with these"}
      </h2>
      <div className="mt-5 space-y-2.5">
        {shown.map((p) => (
          <Link
            key={p.slug}
            href={`/protocol/${p.slug}`}
            className="glass glass-hover flex items-center justify-between gap-4 p-4"
          >
            <div className="min-w-0">
              <div className="t-display truncate text-[1.05rem] tracking-normal text-ink">
                {p.name}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[0.7rem] text-ink-faint">
                <span className="t-freq text-cyan">{p.freqCount} freq</span>
                <span className="opacity-40">/</span>
                <span className="truncate">{p.category}</span>
              </div>
            </div>
            <div className="grid size-9 shrink-0 place-items-center rounded-full border border-cyan/35 bg-cyan/10">
              <ArrowRight className="size-4 text-cyan-glow" />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

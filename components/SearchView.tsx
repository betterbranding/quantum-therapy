"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search as SearchIcon, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CATEGORIES } from "@/lib/supabase/types";
import { TONES, type ToneSeed } from "@/data/tones";
import { cn } from "@/lib/utils";

type Hit = { slug: string; name: string; category: string; count: number };
type Tab = "protocols" | "tones";

type SearchViewProps = {
  initialQuery: string;
  initialCategory: string;
  initialTab: Tab;
  initialResults: Hit[];
};

export function SearchView({ initialQuery, initialCategory, initialTab, initialResults }: SearchViewProps) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [results, setResults] = useState<Hit[]>(initialResults);
  const [loading, setLoading] = useState(false);
  const firstFetch = useRef(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (tab === "tones") params.set("tab", "tones");
    const qs = params.toString();
    router.replace(qs ? `/search?${qs}` : "/search", { scroll: false });
  }, [q, category, tab, router]);

  useEffect(() => {
    if (tab !== "protocols") return;
    if (firstFetch.current) {
      firstFetch.current = false;
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q, category, limit: "40" });
        const res = await fetch(`/api/search?${params.toString()}`, { signal: ctrl.signal });
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, category, tab]);

  const toneResults = useMemo(() => {
    const term = q.trim().toLowerCase();
    return TONES.filter((t) => {
      if (category && t.category !== category) return false;
      if (!term) return true;
      return (
        t.name.toLowerCase().includes(term) ||
        t.category.toLowerCase().includes(term) ||
        t.frequency.toString().includes(term)
      );
    });
  }, [q, category]);

  const nearbyCategories = useMemo(() => CATEGORIES.filter((c) => c !== category).slice(0, 4), [category]);

  return (
    <div className="pb-4">
      <PageHeader eyebrow="The Library" title="Search" />

      <div className="sticky top-0 z-20 -mx-5 mt-4 bg-void/85 px-5 pt-1 pb-3 backdrop-blur-md">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a condition, pathogen or symptom"
            className="input py-3.5 pr-10 pl-11 text-[0.9rem]"
            autoComplete="off"
            spellCheck={false}
            aria-label="Search"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-faint transition-colors hover:text-ink"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setCategory("")}
            className="chip shrink-0"
            data-active={category === "" ? "true" : undefined}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c === category ? "" : c)}
              className="chip shrink-0"
              data-active={category === c ? "true" : undefined}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-2xl border border-hairline/70 bg-deep/60 p-1">
          {(["protocols", "tones"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-xl py-2 text-[0.72rem] font-semibold tracking-[0.05em] uppercase transition-colors",
                tab === t ? "bg-cyan/15 text-cyan-glow" : "text-ink-faint hover:text-ink-soft",
              )}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t === "protocols" ? "Protocols" : "Tones"}
            </button>
          ))}
        </div>
      </div>

      {tab === "protocols" ? (
        <ProtocolResults
          results={results}
          loading={loading}
          query={q}
          nearby={nearbyCategories}
          onPickCategory={setCategory}
        />
      ) : (
        <ToneResults results={toneResults} query={q} />
      )}
    </div>
  );
}

function ProtocolResults({
  results,
  loading,
  query,
  nearby,
  onPickCategory,
}: {
  results: Hit[];
  loading: boolean;
  query: string;
  nearby: readonly string[];
  onPickCategory: (c: string) => void;
}) {
  if (loading && results.length === 0) {
    return <div className="mt-16 text-center text-[0.8rem] text-ink-faint">Searching...</div>;
  }

  if (results.length === 0) {
    return (
      <div className="glass mt-6 p-6 text-center">
        <p className="t-display text-[1.1rem] text-ink">No protocols found</p>
        <p className="mt-2 text-[0.82rem] leading-relaxed text-ink-mute">
          {query.trim()
            ? `Nothing matches "${query.trim()}". Try a broader term or browse a category below.`
            : "Search any condition, pathogen or symptom to begin."}
        </p>
        {nearby.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {nearby.map((c) => (
              <button key={c} onClick={() => onPickCategory(c)} className="chip">
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2.5">
      {results.map((p) => (
        <Link
          key={p.slug}
          href={`/protocol/${p.slug}`}
          className="glass glass-hover flex items-center justify-between gap-4 p-4"
        >
          <div className="min-w-0">
            <div className="t-display truncate text-[1rem] tracking-normal text-ink">{p.name}</div>
            <div className="mt-1 truncate text-[0.72rem] text-ink-faint">{p.category}</div>
          </div>
          <span className="t-freq shrink-0 text-[0.75rem] text-cyan">{p.count} Hz</span>
        </Link>
      ))}
    </div>
  );
}

function ToneResults({ results, query }: { results: ToneSeed[]; query: string }) {
  if (results.length === 0) {
    return (
      <div className="glass mt-6 p-6 text-center">
        <p className="t-display text-[1.1rem] text-ink">No tones found</p>
        <p className="mt-2 text-[0.82rem] leading-relaxed text-ink-mute">
          {query.trim() ? `Nothing matches "${query.trim()}" among the 22 tones.` : "22 tones across five categories."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2.5">
      {results.map((t) => (
        <Link
          key={t.id}
          href={`/frequency/${t.id}`}
          className="glass glass-hover flex items-center justify-between gap-4 p-4"
        >
          <div className="min-w-0">
            <div className="t-display truncate text-[1rem] tracking-normal text-ink">{t.name}</div>
            <div className="mt-1 truncate text-[0.72rem] text-ink-faint">{t.category}</div>
          </div>
          <span className="t-freq shrink-0 text-[0.85rem] text-cyan">{t.frequency} Hz</span>
        </Link>
      ))}
    </div>
  );
}

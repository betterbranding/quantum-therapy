"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Search, CornerDownLeft, Loader2 } from "lucide-react";

type Hit = { slug: string; name: string; category: string; count: number };

export function SearchLauncher() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}&limit=6`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        setHits(data.results ?? []);
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
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div ref={boxRef} className="relative z-30">
      <form onSubmit={submit}>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search a condition, pathogen or symptom"
            className="input py-4 pr-12 pl-11 text-[0.9rem]"
            autoComplete="off"
            spellCheck={false}
            aria-label="Search protocols"
          />
          <div className="absolute top-1/2 right-3.5 -translate-y-1/2">
            {loading ? (
              <Loader2 className="size-4 animate-spin text-cyan" />
            ) : (
              <CornerDownLeft className="size-4 text-ink-faint/60" />
            )}
          </div>
        </div>
      </form>

      <AnimatePresence>
        {open && hits.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="glass absolute inset-x-0 top-[calc(100%+0.5rem)] overflow-hidden p-1.5"
          >
            {hits.map((h) => (
              <button
                key={h.slug}
                onClick={() => router.push(`/protocol/${h.slug}`)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-cyan/8"
              >
                <div className="min-w-0">
                  <div className="truncate text-[0.85rem] font-medium text-ink">{h.name}</div>
                  <div className="truncate text-[0.68rem] text-ink-faint">{h.category}</div>
                </div>
                <span className="t-freq shrink-0 text-[0.68rem] text-cyan">{h.count} Hz sets</span>
              </button>
            ))}
            <button
              onClick={() => router.push(`/search?q=${encodeURIComponent(q.trim())}`)}
              className="mt-1 w-full rounded-2xl border-t border-hairline/60 px-3 py-2.5 text-[0.72rem] font-medium tracking-wide text-cyan transition-colors hover:bg-cyan/8"
            >
              See all results for &ldquo;{q.trim()}&rdquo;
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

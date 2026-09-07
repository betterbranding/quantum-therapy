import Link from "next/link";
import { ArrowRight, Headphones, Search as SearchIcon, Sparkles, Waves } from "lucide-react";
import { ResonanceHero } from "@/components/ResonanceHero";
import { SearchLauncher } from "@/components/SearchLauncher";
import { PROTOCOL_COUNT, FREQUENCY_COUNT, categoryCounts, localProtocols } from "@/lib/protocols";
import { TONES } from "@/data/tones";
import { IntentFeatured, type FeaturedItem } from "@/components/IntentFeatured";
import { ALL_INTENT_SLUGS } from "@/lib/intent";

const QUICK = [
  "Anxiety",
  "Insomnia",
  "Sinusitis",
  "Arthritis",
  "Migraine",
  "Candida",
  "Lyme",
  "Inflammation",
  "Detox",
  "Fatigue",
];

export default function HomePage() {
  const cats = categoryCounts().slice(0, 8);
  // Pool of every protocol any onboarding intent might feature. The client
  // component picks four from here based on the visitor's declared intent, so
  // the featured list personalises without shipping all 1,395 to the browser.
  const bySlug = new Map(localProtocols().map((p) => [p.slug, p]));
  const featuredPool: FeaturedItem[] = ALL_INTENT_SLUGS.map((s) => bySlug.get(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      freqCount: p.frequencies.length,
    }));

  return (
    <div className="px-5 pt-3">
      {/* ---------------- HERO ---------------- */}
      <header className="relative">
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2.5">
            <div className="relative grid size-8 place-items-center rounded-xl border border-cyan/40 bg-cyan/10">
              <Waves className="size-4 text-cyan-glow" strokeWidth={2.2} />
            </div>
            <span
              className="text-[0.8rem] font-semibold tracking-[0.2em] uppercase text-ink-soft"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              Quantum
            </span>
          </div>
          <Link href="/pricing" className="t-label opacity-70 transition-opacity hover:opacity-100">
            Plans
          </Link>
        </div>

        <ResonanceHero />

        <div className="rise -mt-4 text-center" style={{ animationDelay: "0.1s" }}>
          <h1 className="t-hero">
            <span className="block text-ink">Your body</span>
            <span className="block text-ink">runs on</span>
            <span className="grad-primary block">frequency</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[30ch] text-[0.95rem] leading-relaxed text-ink-mute">
            Search any condition. Get the Rife protocol. Play it as a binaural beat session in
            seconds.
          </p>
        </div>
      </header>

      {/* ---------------- SEARCH ---------------- */}
      <section className="rise mt-7" style={{ animationDelay: "0.2s" }}>
        <SearchLauncher />

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {QUICK.map((q) => (
            <Link key={q} href={`/search?q=${encodeURIComponent(q)}`} className="chip shrink-0">
              {q}
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------- STATS ---------------- */}
      <section className="rise mt-6 grid grid-cols-3 gap-2.5" style={{ animationDelay: "0.3s" }}>
        {[
          { value: PROTOCOL_COUNT.toLocaleString(), label: "Protocols" },
          { value: FREQUENCY_COUNT.toLocaleString(), label: "Frequencies" },
          { value: TONES.length.toString(), label: "Pure Tones" },
        ].map((s) => (
          <div key={s.label} className="glass px-2 py-4 text-center">
            <div className="t-freq grad-cyan text-[1.35rem] leading-none">{s.value}</div>
            <div className="mt-1.5 text-[0.575rem] font-medium tracking-[0.16em] uppercase text-ink-faint">
              {s.label}
            </div>
          </div>
        ))}
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section className="rise mt-10" style={{ animationDelay: "0.36s" }}>
        <p className="t-label">The Session</p>
        <h2 className="t-display mt-2 text-[1.75rem] text-ink">Three steps to resonance</h2>

        <div className="mt-5 space-y-2.5">
          {[
            {
              n: "01",
              Icon: SearchIcon,
              title: "Find your protocol",
              body: "1,395 protocols from the Consolidated Annotated Frequency List, indexed by condition, alias and category.",
            },
            {
              n: "02",
              Icon: Headphones,
              title: "Put on headphones",
              body: "Binaural beats need both ears. Two carrier tones, a few Hz apart, and your brain hears the difference.",
            },
            {
              n: "03",
              Icon: Sparkles,
              title: "Let it run",
              body: "Each frequency plays in sequence over an ambient bed. Add Grounding, Clearing and Lock-In phases.",
            },
          ].map((s) => (
            <div key={s.n} className="glass glass-hover flex gap-4 p-4">
              <div className="flex flex-col items-center gap-2">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-cyan/30 bg-cyan/8">
                  <s.Icon className="size-[18px] text-cyan" strokeWidth={1.9} />
                </div>
                <span className="t-freq text-[0.6rem] text-ink-faint">{s.n}</span>
              </div>
              <div className="pt-0.5">
                <h3 className="t-display text-[1.05rem] tracking-normal text-ink">{s.title}</h3>
                <p className="mt-1.5 text-[0.83rem] leading-relaxed text-ink-mute">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- CATEGORIES ---------------- */}
      <section className="rise mt-10" style={{ animationDelay: "0.42s" }}>
        <div className="flex items-end justify-between">
          <div>
            <p className="t-label">The Library</p>
            <h2 className="t-display mt-2 text-[1.75rem] text-ink">Browse by system</h2>
          </div>
          <Link
            href="/search"
            className="flex items-center gap-1 pb-1 text-[0.75rem] font-medium text-cyan transition-colors hover:text-cyan-glow"
          >
            All <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {cats.map((c) => (
            <Link
              key={c.category}
              href={`/search?category=${encodeURIComponent(c.category)}`}
              className="glass glass-hover group relative overflow-hidden p-4"
            >
              <div className="t-freq text-[1.6rem] leading-none text-ink/90 transition-colors group-hover:text-cyan-glow">
                {c.count}
              </div>
              <div className="mt-2 text-[0.78rem] leading-snug font-medium text-ink-soft">
                {c.category}
              </div>
              <div className="absolute -right-6 -bottom-6 size-16 rounded-full bg-cyan/8 blur-xl transition-all duration-500 group-hover:bg-cyan/20" />
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------- TONES TEASER ---------------- */}
      <section className="rise mt-10" style={{ animationDelay: "0.48s" }}>
        <Link href="/frequencies" className="glass rim glass-hover block overflow-hidden p-5">
          <p className="t-label">Pure Tones</p>
          <h2 className="t-display mt-2 text-[1.6rem] text-ink">
            Solfeggio, Tesla,
            <br />
            Schumann, Brainwave
          </h2>
          <p className="mt-2.5 max-w-[34ch] text-[0.83rem] leading-relaxed text-ink-mute">
            22 single frequencies for focus, sleep, grounding and repair. No protocol needed, just
            press play.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {TONES.slice(0, 7).map((t) => (
              <span
                key={t.id}
                className="t-freq rounded-lg border border-hairline/70 bg-deep/60 px-2 py-1 text-[0.65rem] text-ink-soft"
              >
                {t.frequency} Hz
              </span>
            ))}
            <span className="t-freq rounded-lg border border-cyan/35 bg-cyan/10 px-2 py-1 text-[0.65rem] text-cyan-glow">
              +15
            </span>
          </div>
        </Link>
      </section>

      {/* ---------------- FEATURED ---------------- */}
      <section className="rise mt-10" style={{ animationDelay: "0.54s" }}>
        <IntentFeatured pool={featuredPool} />
      </section>

      {/* ---------------- DR RIFE ---------------- */}
      <section className="rise mt-12" style={{ animationDelay: "0.6s" }}>
        <div className="glass overflow-hidden p-6">
          <p className="t-label">1888 to 1971</p>
          <h2 className="t-display mt-2 text-[1.9rem] leading-[0.95] text-ink">
            Royal Raymond
            <br />
            <span className="grad-pink">Rife</span>
          </h2>
          <div className="mt-4 space-y-3 text-[0.85rem] leading-relaxed text-ink-mute">
            <p>
              An American inventor who built the Universal Microscope in 1933, an optical instrument
              capable of magnifications far beyond what his contemporaries believed possible.
            </p>
            <p>
              Rife proposed that every organism has a Mortal Oscillatory Rate, a resonant frequency
              at which it can be disrupted without harming surrounding tissue. He spent decades
              cataloguing those rates.
            </p>
            <p>
              His work was never accepted by mainstream medicine, but the frequency lists he and
              later researchers compiled became the Consolidated Annotated Frequency List, the
              public-domain database this app is built on.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Universal Microscope", "Mortal Oscillatory Rate", "CAFL"].map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- DISCLAIMER ---------------- */}
      <section className="mt-8 mb-6">
        <div className="rounded-2xl border border-amber/20 bg-amber/5 p-4">
          <p className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-amber/90">
            Important
          </p>
          <p className="mt-2 text-[0.76rem] leading-relaxed text-ink-mute">
            Quantum Therapy is an experimental and educational tool. Rife frequencies are not
            evaluated or approved by any medical authority, and nothing here is medical advice,
            diagnosis or treatment. Always consult a qualified healthcare provider about any medical
            condition. Do not use while driving, and do not use if you have epilepsy, a pacemaker or
            are pregnant without clearing it with your doctor first.
          </p>
          <div className="mt-3 flex gap-4 text-[0.7rem] text-ink-faint">
            <Link href="/privacy" className="hover:text-cyan">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-cyan">
              Terms
            </Link>
            <span className="opacity-60">Better Branding LLC</span>
          </div>
        </div>
      </section>
    </div>
  );
}

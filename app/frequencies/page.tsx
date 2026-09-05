import type { Metadata } from "next";
import Link from "next/link";
import { Headphones } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { TONES, TONE_CATEGORIES } from "@/data/tones";
import { BINAURAL_MAX_HZ } from "@/lib/audio/engine";

export const metadata: Metadata = {
  title: "Frequencies",
  description: "22 pure tones across Solfeggio, Tesla, Schumann, Brainwave and Angel categories.",
};

export default function FrequenciesPage() {
  const grouped = TONE_CATEGORIES.map((category) => ({
    category,
    tones: TONES.filter((t) => t.category === category),
  }));

  return (
    <div className="px-5 pt-3 pb-4">
      <PageHeader eyebrow="Pure Tones" title="22 frequencies" />

      <div className="rise glass mt-5 p-4" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-cyan/30 bg-cyan/8">
            <Headphones className="size-4 text-cyan" strokeWidth={1.9} />
          </div>
          <p className="mt-0.5 text-[0.8rem] leading-relaxed text-ink-mute">
            Below {BINAURAL_MAX_HZ.toLocaleString()} Hz, each ear hears a slightly different tone and the brain
            perceives the difference as a binaural beat. At or above {BINAURAL_MAX_HZ.toLocaleString()} Hz the beat
            would sit outside audible range, so the tone is delivered as an isochronic pulse instead, a single tone
            switched on and off at that rate.
          </p>
        </div>
      </div>

      {grouped.map((g, gi) => (
        <section key={g.category} className="rise mt-8" style={{ animationDelay: `${0.1 + gi * 0.06}s` }}>
          <p className="t-label">{g.category}</p>
          <h2 className="t-display mt-2 text-[1.4rem] text-ink">{g.category} tones</h2>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {g.tones.map((t) => (
              <Link
                key={t.id}
                href={`/frequency/${t.id}`}
                className="glass glass-hover relative overflow-hidden p-4"
                style={{ borderColor: `color-mix(in oklch, ${t.accent} 32%, transparent)` }}
              >
                <div
                  className="absolute -top-6 -right-6 size-20 rounded-full opacity-25 blur-2xl"
                  style={{ background: t.accent }}
                  aria-hidden
                />
                <div className="t-freq relative text-[1.4rem] leading-none" style={{ color: t.accent }}>
                  {t.frequency}
                  <span className="ml-1 text-[0.6rem] text-ink-faint">Hz</span>
                </div>
                <div className="relative mt-2 text-[0.85rem] font-medium text-ink">{t.name}</div>
                <p className="relative mt-1 text-[0.7rem] leading-snug text-ink-faint">{t.description}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

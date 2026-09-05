"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { TIERS, type TierId } from "@/lib/tiers";
import { cn } from "@/lib/utils";

type BillingInterval = "monthly" | "yearly";

const FAQ: { q: string; a: string }[] = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Manage billing from your profile and cancel at any time. You keep access through the end of the current billing period, no partial refunds.",
  },
  {
    q: "What happens when I hit the free limit?",
    a: "Free includes 10 sessions per month. Once used, new sessions pause until the next monthly cycle unless you upgrade to Pro or Premium for unlimited sessions.",
  },
  {
    q: "Do I need headphones?",
    a: "Yes, for binaural sessions. Both ears need to receive a separate tone for the beat to form. Isochronic sessions above 1,500 Hz work on speakers too, but headphones are still recommended.",
  },
];

export function PricingCards() {
  const router = useRouter();
  const [interval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [loadingTier, setLoadingTier] = useState<TierId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const subscribe = async (tier: TierId) => {
    if (tier === "free") return;
    setError(null);
    setLoadingTier(tier);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval }),
      });
      if (res.status === 401) {
        router.push("/profile");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Unable to start checkout. Try again in a moment.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Unable to reach billing. Check your connection and try again.");
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="mt-6">
      <div className="rise mx-auto flex w-fit gap-1 rounded-2xl border border-hairline/70 bg-deep/60 p-1">
        {(["monthly", "yearly"] as const).map((i) => (
          <button
            key={i}
            onClick={() => setBillingInterval(i)}
            className={cn(
              "rounded-xl px-4 py-2 text-[0.72rem] font-semibold tracking-[0.05em] uppercase transition-colors",
              interval === i ? "bg-cyan/15 text-cyan-glow" : "text-ink-faint hover:text-ink-soft",
            )}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {i === "monthly" ? "Monthly" : "Yearly"}
          </button>
        ))}
      </div>

      {error && (
        <div className="rise mt-4 rounded-2xl border border-magenta/30 bg-magenta/8 p-3 text-center text-[0.78rem] text-ink-soft">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {TIERS.map((tier, i) => {
          const price = interval === "monthly" ? tier.monthly : tier.yearly;
          const perMonth = interval === "yearly" && tier.monthly > 0 ? tier.yearly / 12 : price;
          const saving =
            interval === "yearly" && tier.monthly > 0
              ? Math.round((1 - tier.yearly / (tier.monthly * 12)) * 100)
              : 0;

          return (
            <div
              key={tier.id}
              className={cn("rise glass relative overflow-visible p-5", tier.highlight && "rim")}
              style={{ animationDelay: `${0.1 + i * 0.06}s` }}
            >
              {tier.highlight && (
                <span className="t-label absolute -top-3 left-5 rounded-full border border-cyan/40 bg-abyss px-3 py-1 text-cyan-glow">
                  Most chosen
                </span>
              )}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="t-display text-[1.3rem] text-ink">{tier.name}</h3>
                  <p className="mt-1 text-[0.78rem] text-ink-mute">{tier.tagline}</p>
                </div>
                {tier.highlight && <Sparkles className="size-5 shrink-0 text-cyan" />}
              </div>

              <div className="mt-4 flex items-end gap-1.5">
                <span className="t-freq grad-cyan text-[2rem] leading-none">
                  ${price === 0 ? "0" : perMonth.toFixed(2)}
                </span>
                {price > 0 && <span className="pb-1 text-[0.72rem] text-ink-faint">/mo</span>}
              </div>
              {saving > 0 && (
                <p className="mt-1 text-[0.7rem] text-cyan">
                  Billed ${tier.yearly.toFixed(2)}/yr, save {saving}%
                </p>
              )}

              <ul className="mt-4 space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[0.8rem] text-ink-soft">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-cyan" strokeWidth={2.4} />
                    {f}
                  </li>
                ))}
              </ul>

              {tier.id === "free" ? (
                <Link href="/search" className="btn btn-ghost mt-5 w-full py-3 text-[0.72rem]">
                  Start free
                </Link>
              ) : (
                <button
                  onClick={() => subscribe(tier.id)}
                  disabled={loadingTier === tier.id}
                  className={cn("mt-5 w-full py-3 text-[0.72rem]", tier.highlight ? "btn btn-primary" : "btn btn-ghost")}
                >
                  {loadingTier === tier.id ? "Redirecting..." : `Choose ${tier.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-10">
        <p className="t-label">Questions</p>
        <h2 className="t-display mt-2 text-[1.5rem] text-ink">Before you choose</h2>
        <div className="mt-4 space-y-2.5">
          {FAQ.map((item, i) => (
            <div key={item.q} className="glass overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <span className="text-[0.85rem] font-medium text-ink">{item.q}</span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-ink-faint transition-transform",
                    openFaq === i && "rotate-180",
                  )}
                />
              </button>
              {openFaq === i && (
                <p className="px-4 pb-4 text-[0.8rem] leading-relaxed text-ink-mute">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, CreditCard, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TIER_BY_ID, type TierId } from "@/lib/tiers";

type AccountPanelProps = {
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  tier: TierId;
  sessionsUsed: number;
};

export function AccountPanel({ email, fullName, avatarUrl, tier, sessionsUsed }: AccountPanelProps) {
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const plan = TIER_BY_ID[tier];
  const limit = plan.sessionsPerMonth;
  const progress = limit ? Math.min(1, sessionsUsed / limit) : 0;
  const displayName = fullName || email || "Member";
  const initial = displayName.charAt(0).toUpperCase();

  const manageBilling = async () => {
    setBillingError(null);
    setBillingLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setBillingError(data.error ?? "No billing account found. Subscribe to a paid plan first.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setBillingError("Unable to reach billing. Try again in a moment.");
    } finally {
      setBillingLoading(false);
    }
  };

  const signOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/profile";
  };

  return (
    <div className="rise mt-6" style={{ animationDelay: "0.05s" }}>
      <div className="glass rim p-5">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="size-14 shrink-0 rounded-full border border-hairline object-cover" />
          ) : (
            <div className="grid size-14 shrink-0 place-items-center rounded-full border border-cyan/35 bg-cyan/10">
              <span className="t-display text-[1.3rem] text-cyan-glow">{initial}</span>
            </div>
          )}
          <div className="min-w-0">
            <div className="t-display truncate text-[1.1rem] text-ink">{displayName}</div>
            {email && <div className="truncate text-[0.75rem] text-ink-faint">{email}</div>}
            <span className="t-label mt-1.5 inline-block rounded-full border border-cyan/35 bg-cyan/10 px-2.5 py-1 text-cyan-glow">
              {plan.name}
            </span>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-[0.7rem] text-ink-faint">
            <span>Sessions this month</span>
            <span className="t-freq text-ink-soft">
              {sessionsUsed}
              {limit ? ` / ${limit}` : " / unlimited"}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-hairline/60">
            <div
              className="h-full rounded-full bg-cyan transition-[width] duration-300"
              style={{ width: limit ? `${progress * 100}%` : "100%" }}
            />
          </div>
        </div>

        {billingError && <p className="mt-4 text-[0.75rem] text-magenta">{billingError}</p>}

        <div className="mt-5 flex gap-2.5">
          <button
            onClick={manageBilling}
            disabled={billingLoading}
            className="btn btn-ghost flex-1 gap-2 py-3 text-[0.68rem]"
          >
            <CreditCard className="size-3.5" />
            {billingLoading ? "Loading..." : "Manage billing"}
          </button>
          {tier !== "premium" && (
            <Link href="/pricing" className="btn btn-primary flex-1 gap-2 py-3 text-[0.68rem]">
              <ArrowUpRight className="size-3.5" />
              Upgrade
            </Link>
          )}
        </div>
      </div>

      <button onClick={signOut} disabled={signingOut} className="btn btn-ghost mt-3 w-full gap-2 py-3 text-[0.68rem]">
        <LogOut className="size-3.5" />
        {signingOut ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}

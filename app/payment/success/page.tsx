import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Payment Successful" };

export default function PaymentSuccessPage() {
  return (
    <div className="px-5 pt-3 pb-4">
      <PageHeader eyebrow="Billing" title="You're all set" />

      <div className="rise glass rim mt-8 p-8 text-center" style={{ animationDelay: "0.05s" }}>
        <div className="mx-auto grid size-16 place-items-center rounded-full border border-cyan/35 bg-cyan/10">
          <CheckCircle2 className="size-8 text-cyan-glow" strokeWidth={1.8} />
        </div>
        <h2 className="t-display mt-5 text-[1.4rem] text-ink">Payment confirmed</h2>
        <p className="mt-3 text-[0.85rem] leading-relaxed text-ink-mute">
          Thank you. Your subscription is active. It can take a few seconds for your new plan to appear on your
          profile while billing finishes syncing.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <Link href="/search" className="btn btn-primary w-full py-3.5 text-[0.72rem]">
            Start a session
          </Link>
          <Link href="/profile" className="btn btn-ghost w-full py-3.5 text-[0.72rem]">
            View profile
          </Link>
        </div>
      </div>
    </div>
  );
}

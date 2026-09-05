import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { PricingCards } from "@/components/PricingCards";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Compare Quantum Therapy Free, Pro and Premium plans.",
};

export default function PricingPage() {
  return (
    <div className="px-5 pt-3 pb-4">
      <PageHeader eyebrow="Plans" title="Choose your tier" />
      <PricingCards />
    </div>
  );
}

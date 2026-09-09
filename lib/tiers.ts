export type TierId = "free" | "pro" | "premium";

export type Tier = {
  id: TierId;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  sessionsPerMonth: number | null; // null = unlimited
  ambientPresets: number;
  features: string[];
  highlight?: boolean;
};

export const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Explore the full library",
    monthly: 0,
    yearly: 0,
    sessionsPerMonth: 10,
    ambientPresets: 5,
    features: [
      "All 1,395 CAFL protocols",
      "22 standalone tones",
      "10 sessions per month",
      "5 core synth pad soundscapes",
      "Binaural and isochronic playback",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Unlimited daily practice",
    monthly: 9.99,
    yearly: 107.89,
    sessionsPerMonth: null,
    ambientPresets: 11,
    features: [
      "Everything in Free",
      "Unlimited sessions",
      "Signature Series: 6 studio-mastered pads",
      "Grounding, Clearing and Lock-In phases",
      "Offline WAV session downloads",
      "Custom frequency duration",
    ],
    highlight: true,
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Track the whole journey",
    monthly: 19.99,
    yearly: 215.89,
    sessionsPerMonth: null,
    ambientPresets: 11,
    features: [
      "Everything in Pro",
      "Full session history and analytics",
      "Favorites and custom stacks",
      "Priority access to new protocols",
      "Email support",
    ],
  },
];

export const TIER_BY_ID = Object.fromEntries(TIERS.map((t) => [t.id, t])) as Record<TierId, Tier>;

export function tierRank(t: TierId): number {
  return t === "premium" ? 2 : t === "pro" ? 1 : 0;
}

export function canUse(tier: TierId, feature: "ambient" | "phases" | "download" | "history"): boolean {
  const r = tierRank(tier);
  if (feature === "ambient") return true;
  if (feature === "history") return r >= 2;
  return r >= 1;
}

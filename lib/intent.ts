/**
 * Onboarding intent: the one thing we ask a new visitor before anything else.
 *
 * A single declared goal ("What are you here for?") drives three things:
 *   1. Which protocols the home page surfaces first (Personalisation).
 *   2. Which ambient pad is pre-selected on a player (Setup Defaults).
 *   3. What gets written to profiles.intent at sign-in, so the CRM and email
 *      cadence know why the person showed up (Commitment).
 *
 * It lives in localStorage so it works before an account exists, and syncs to
 * Supabase the first time the user signs in.
 */

import type { AmbientPresetId } from "@/lib/audio/ambient";

export type IntentId =
  | "sleep"
  | "pain"
  | "anxiety"
  | "immune"
  | "energy"
  | "detox"
  | "focus"
  | "explore";

export type IntentDef = {
  id: IntentId;
  label: string;
  /** Search terms used to rank the home library toward this goal. */
  match: string[];
  /** Curated protocol slugs to feature first, in order. */
  slugs: string[];
  /** Pad pre-selected on the player. Deep Space is the only free pad. */
  pad: AmbientPresetId;
};

/**
 * Curated so a first impression never lands on "Abdominal inflammation".
 * Slugs are validated against the shipped library at build-relevant call
 * sites; any slug missing from the data is silently skipped by the caller.
 */
export const INTENTS: IntentDef[] = [
  {
    id: "sleep",
    label: "Sleep",
    match: ["insomnia", "sleep", "relaxation", "calm"],
    slugs: ["insomnia", "relaxation-to-produce", "muscles-to-relax", "anxiety-1"],
    pad: "deep-space",
  },
  {
    id: "pain",
    label: "Pain",
    match: ["pain", "inflammation", "arthritis", "headache"],
    slugs: ["pain-general", "acute-pain", "arthritis", "migraine"],
    pad: "ocean-drift",
  },
  {
    id: "anxiety",
    label: "Anxiety",
    match: ["anxiety", "stress", "panic", "calm"],
    slugs: ["anxiety-1", "depression-general", "nerves-healing", "relaxation-to-produce"],
    pad: "aurora",
  },
  {
    id: "immune",
    label: "Immune",
    match: ["immune", "infection", "virus", "bacteria"],
    slugs: ["immune-system-stimulation", "lyme-disease", "candida", "cold-and-flu"],
    pad: "forest-dawn",
  },
  {
    id: "energy",
    label: "Energy",
    match: ["fatigue", "energy", "vitality", "adrenal"],
    slugs: ["energy-vitality", "adrenal-stimulant", "chronic-fatigue-syndrome", "circulation-disturbances"],
    pad: "forest-dawn",
  },
  {
    id: "detox",
    label: "Detox",
    match: ["detox", "cleanse", "liver", "lymph"],
    slugs: ["detox-and-lymphs", "liver-support", "chemtrail-detox", "candida"],
    pad: "ocean-drift",
  },
  {
    id: "focus",
    label: "Focus",
    match: ["focus", "concentration", "clarity", "memory"],
    slugs: ["mental-concentration", "intelligence-and-clarity-of-thought", "brain-beta-stim-tr", "energy-vitality"],
    pad: "crystal-cavern",
  },
  {
    id: "explore",
    label: "Just exploring",
    match: [],
    slugs: ["insomnia", "pain-general", "lyme-disease", "candida"],
    pad: "deep-space",
  },
];

/** Slugs shown when no intent is set. Matches the old hand-picked home set. */
export const DEFAULT_FEATURED_SLUGS = ["insomnia", "pain-general", "lyme-disease", "candida"];

/** Every slug any intent might feature, for the home page to pre-resolve. */
export const ALL_INTENT_SLUGS: string[] = Array.from(
  new Set([...INTENTS.flatMap((i) => i.slugs), ...DEFAULT_FEATURED_SLUGS]),
);

export function intentById(id: string | null | undefined): IntentDef | null {
  if (!id) return null;
  return INTENTS.find((i) => i.id === id) ?? null;
}

const KEY = "qt.intent.v1";

export function loadIntent(): IntentId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw && INTENTS.some((i) => i.id === raw) ? (raw as IntentId) : null;
  } catch {
    return null;
  }
}

export function saveIntent(id: IntentId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* private mode. Not worth surfacing. */
  }
}

/** True once the intent screen has been answered or dismissed. */
const DONE_KEY = "qt.onboarded.v1";

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return Boolean(window.localStorage.getItem(DONE_KEY));
  } catch {
    return true;
  }
}

export function markOnboarded(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DONE_KEY, "1");
  } catch {
    /* noop */
  }
}

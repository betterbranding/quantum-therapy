/**
 * The 22 standalone single-frequency tones.
 * Seeded into Supabase `tones` by scripts/seed.ts, and used directly on the
 * client so the tones grid renders instantly with no round trip.
 */

export type ToneSeed = {
  id: string;
  name: string;
  frequency: number;
  category: "Solfeggio" | "Tesla" | "Schumann" | "Brainwave" | "Angel";
  description: string;
  benefits: string[];
  accent: string;
};

export const TONES: ToneSeed[] = [
  // ---------- Solfeggio ----------
  {
    id: "solfeggio-174",
    name: "Foundation",
    frequency: 174,
    category: "Solfeggio",
    description: "The lowest Solfeggio tone, traditionally used as a natural anaesthetic and a grounding base layer.",
    benefits: ["Pain relief", "Physical grounding", "Sense of safety"],
    accent: "#22d3ee",
  },
  {
    id: "solfeggio-285",
    name: "Restoration",
    frequency: 285,
    category: "Solfeggio",
    description: "Associated with tissue repair and returning the body to its original blueprint.",
    benefits: ["Tissue repair", "Cellular renewal", "Recovery support"],
    accent: "#2dd4bf",
  },
  {
    id: "solfeggio-396",
    name: "Liberation",
    frequency: 396,
    category: "Solfeggio",
    description: "UT. Works on releasing fear, guilt and the low-grade tension that sits underneath them.",
    benefits: ["Releases fear", "Dissolves guilt", "Root chakra"],
    accent: "#f87171",
  },
  {
    id: "solfeggio-417",
    name: "Undoing",
    frequency: 417,
    category: "Solfeggio",
    description: "RE. Traditionally used to clear stagnant patterns and make room for change.",
    benefits: ["Breaks patterns", "Clears trauma", "Sacral chakra"],
    accent: "#fb923c",
  },
  {
    id: "solfeggio-528",
    name: "Transformation",
    frequency: 528,
    category: "Solfeggio",
    description: "MI. The best known Solfeggio tone, widely called the love or repair frequency.",
    benefits: ["DNA repair lore", "Deep calm", "Heart opening"],
    accent: "#4ade80",
  },
  {
    id: "solfeggio-639",
    name: "Connection",
    frequency: 639,
    category: "Solfeggio",
    description: "FA. Used for relationship harmony, communication and reconnection.",
    benefits: ["Relationship harmony", "Empathy", "Heart chakra"],
    accent: "#34d399",
  },
  {
    id: "solfeggio-741",
    name: "Expression",
    frequency: 741,
    category: "Solfeggio",
    description: "SOL. Associated with detoxification, clear speech and problem solving.",
    benefits: ["Cleansing", "Clear expression", "Throat chakra"],
    accent: "#38bdf8",
  },
  {
    id: "solfeggio-852",
    name: "Intuition",
    frequency: 852,
    category: "Solfeggio",
    description: "LA. Used to quiet mental chatter and sharpen inner perception.",
    benefits: ["Intuition", "Mental clarity", "Third eye"],
    accent: "#818cf8",
  },
  {
    id: "solfeggio-963",
    name: "Unity",
    frequency: 963,
    category: "Solfeggio",
    description: "SI. The highest Solfeggio tone, linked to oneness and expanded awareness.",
    benefits: ["Expanded awareness", "Stillness", "Crown chakra"],
    accent: "#c084fc",
  },

  // ---------- Tesla ----------
  {
    id: "tesla-3",
    name: "Tesla 3",
    frequency: 3,
    category: "Tesla",
    description: "The first of Tesla's 3-6-9 key numbers. A deep delta pulse for profound rest.",
    benefits: ["Deep rest", "Delta state", "Physical repair"],
    accent: "#a78bfa",
  },
  {
    id: "tesla-6",
    name: "Tesla 6",
    frequency: 6,
    category: "Tesla",
    description: "Theta range. The threshold between waking and dreaming where imagery runs free.",
    benefits: ["Theta state", "Visualisation", "Creative flow"],
    accent: "#a855f7",
  },
  {
    id: "tesla-9",
    name: "Tesla 9",
    frequency: 9,
    category: "Tesla",
    description: "Tesla called 3, 6 and 9 the key to the universe. Nine sits at the alpha threshold.",
    benefits: ["Alpha threshold", "Relaxed focus", "Integration"],
    accent: "#c026d3",
  },
  {
    id: "tesla-111",
    name: "Tesla 111",
    frequency: 111,
    category: "Tesla",
    description: "A harmonic of the 3-6-9 series often used as a resonance and reset tone.",
    benefits: ["Cellular resonance", "Reset", "Clarity"],
    accent: "#e879f9",
  },

  // ---------- Schumann ----------
  {
    id: "schumann-783",
    name: "Schumann Resonance",
    frequency: 7.83,
    category: "Schumann",
    description: "The fundamental electromagnetic resonance of the Earth's cavity. The grounding tone.",
    benefits: ["Grounding", "Circadian support", "Stress reduction"],
    accent: "#4ade80",
  },
  {
    id: "schumann-1478",
    name: "Schumann Second",
    frequency: 14.3,
    category: "Schumann",
    description: "The second Schumann harmonic, sitting in low beta for alert calm.",
    benefits: ["Alert calm", "Light focus", "Earth harmony"],
    accent: "#65a30d",
  },
  {
    id: "schumann-2080",
    name: "Schumann Third",
    frequency: 20.8,
    category: "Schumann",
    description: "The third Schumann harmonic, a brighter beta band for active work.",
    benefits: ["Active focus", "Alertness", "Drive"],
    accent: "#84cc16",
  },

  // ---------- Brainwave ----------
  {
    id: "brainwave-delta",
    name: "Delta",
    frequency: 2,
    category: "Brainwave",
    description: "The slowest brainwave band. Dreamless sleep, growth hormone release and repair.",
    benefits: ["Deep sleep", "Immune repair", "Total rest"],
    accent: "#3b82f6",
  },
  {
    id: "brainwave-theta",
    name: "Theta",
    frequency: 6,
    category: "Brainwave",
    description: "Drowsy, hypnagogic and deeply meditative. Where insight tends to surface.",
    benefits: ["Deep meditation", "Insight", "Memory access"],
    accent: "#6366f1",
  },
  {
    id: "brainwave-alpha",
    name: "Alpha",
    frequency: 10,
    category: "Brainwave",
    description: "Relaxed wakefulness. Eyes closed, calm, present, receptive.",
    benefits: ["Calm focus", "Stress relief", "Learning"],
    accent: "#22d3ee",
  },
  {
    id: "brainwave-beta",
    name: "Beta",
    frequency: 20,
    category: "Brainwave",
    description: "Ordinary waking cognition. Analysis, conversation and directed attention.",
    benefits: ["Concentration", "Problem solving", "Energy"],
    accent: "#f59e0b",
  },
  {
    id: "brainwave-gamma",
    name: "Gamma",
    frequency: 40,
    category: "Brainwave",
    description: "The fastest band, tied to binding perception and peak cognitive states.",
    benefits: ["Peak cognition", "Perceptual binding", "Recall"],
    accent: "#f43f5e",
  },

  // ---------- Angel ----------
  {
    id: "angel-1111",
    name: "Angel 1111",
    frequency: 1111,
    category: "Angel",
    description: "A high isochronic tone used as an intention and manifestation anchor.",
    benefits: ["Intention setting", "Awakening", "Alignment"],
    accent: "#ec4899",
  },
];

export const TONE_CATEGORIES = ["Solfeggio", "Tesla", "Schumann", "Brainwave", "Angel"] as const;

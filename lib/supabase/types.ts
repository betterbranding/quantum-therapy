export type TierId = "free" | "pro" | "premium";
export type StatusId = "none" | "active" | "trialing" | "canceled" | "past_due";

export type Protocol = {
  id: number;
  slug: string;
  name: string;
  category: string;
  aliases: string[];
  frequencies: number[];
  notes: string | null;
  description: string | null;
  source: string;
  created_at: string;
};

export type Tone = {
  id: string;
  name: string;
  frequency: number;
  category: string;
  description: string;
  benefits: string[];
  accent: string;
  sort_order: number;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_tier: TierId;
  subscription_status: StatusId;
  current_period_end: string | null;
  onboarding_completed: boolean;
  intent: string | null;
  ghl_contact_id: string | null;
  created_at: string;
  updated_at: string;
  last_signed_in_at: string | null;
};

export type SessionRow = {
  id: number;
  user_id: string;
  protocol_id: number | null;
  tone_id: string | null;
  title: string;
  frequencies: number[];
  duration_secs: number;
  completed: boolean;
  ambient_preset: string | null;
  started_at: string;
};

export type Favorite = {
  user_id: string;
  protocol_id: number | null;
  tone_id: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      protocols: { Row: Protocol; Insert: Omit<Protocol, "id" | "created_at">; Update: Partial<Protocol> };
      tones: { Row: Tone; Insert: Tone; Update: Partial<Tone> };
      sessions: { Row: SessionRow; Insert: Partial<SessionRow>; Update: Partial<SessionRow> };
      favorites: { Row: Favorite; Insert: Favorite; Update: Partial<Favorite> };
    };
    Functions: {
      start_session: {
        Args: {
          p_title: string;
          p_frequencies?: number[];
          p_protocol_id?: number | null;
          p_tone_id?: string | null;
          p_ambient?: string | null;
        };
        Returns: SessionRow;
      };
      complete_session: { Args: { p_id: number; p_duration: number }; Returns: undefined };
      sessions_this_month: { Args: { uid: string }; Returns: number };
      search_protocols: { Args: { q: string; lim?: number }; Returns: Protocol[] };
    };
  };
};

export const CATEGORIES = [
  "Cancer & Tumors",
  "Cardiovascular",
  "Dental & Oral",
  "Detox & General Wellness",
  "Digestive",
  "Eye & Ear",
  "General",
  "Immune System",
  "Infections",
  "Metabolic & Endocrine",
  "Mold & Fungi",
  "Musculoskeletal",
  "Nervous System",
  "Pain & Inflammation",
  "Parasites & Worms",
  "Reproductive",
  "Respiratory",
  "Skin",
  "Urinary & Kidney",
  "Wounds & Trauma",
] as const;

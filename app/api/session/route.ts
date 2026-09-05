import { NextRequest, NextResponse } from "next/server";
import { syncSessionToGHL } from "@/lib/ghl";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

type SessionBody = {
  title?: unknown;
  frequencies?: unknown;
  protocolId?: unknown;
  toneId?: unknown;
  ambient?: unknown;
};

function configuredError() {
  return NextResponse.json({ error: "Session tracking is not configured." }, { status: 503 });
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

async function usage(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const [{ data: used, error: usedError }, { data: limit, error: limitError }, { data: profile }] = await Promise.all([
    supabase.rpc("sessions_this_month", { uid: userId }),
    supabase.rpc("monthly_limit_for", { uid: userId }),
    supabase.from("profiles").select("subscription_tier").eq("id", userId).maybeSingle(),
  ]);
  if (usedError || limitError) throw usedError ?? limitError;
  return {
    used: Number(used ?? 0),
    limit: Number(limit ?? 10),
    tier: ((profile as Pick<Profile, "subscription_tier"> | null)?.subscription_tier ?? "free"),
  };
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ used: 0, limit: 10, tier: "free", anonymous: true });
  }
  try {
    const { supabase, user } = await authenticatedClient();
    if (!user) return NextResponse.json({ used: 0, limit: 10, tier: "free", anonymous: true });
    return NextResponse.json(await usage(supabase, user.id));
  } catch (error) {
    console.warn("Unable to read session usage", error);
    return NextResponse.json({ error: "Unable to read session usage." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return configuredError();
  let body: SessionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body.title !== "string" || !body.title.trim() || !Array.isArray(body.frequencies) || !body.frequencies.every((value) => typeof value === "number" && Number.isFinite(value))) {
    return NextResponse.json({ error: "title and frequencies are required." }, { status: 400 });
  }

  try {
    const { supabase, user } = await authenticatedClient();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data, error } = await supabase.rpc("start_session", {
      p_title: body.title.trim(),
      p_frequencies: body.frequencies,
      p_protocol_id: typeof body.protocolId === "number" ? body.protocolId : null,
      p_tone_id: typeof body.toneId === "string" ? body.toneId : null,
      p_ambient: typeof body.ambient === "string" ? body.ambient : null,
    });
    if (error) {
      if (/monthly session limit reached/i.test(error.message)) {
        const current = await usage(supabase, user.id).catch(() => ({ used: 10, limit: 10, tier: "free" as const }));
        return NextResponse.json({ error: "limit", used: current.used, limit: current.limit }, { status: 402 });
      }
      throw error;
    }
    return NextResponse.json({ id: (data as { id: number }).id });
  } catch (error) {
    console.warn("Unable to start session", error);
    return NextResponse.json({ error: "Unable to start session." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSupabaseConfigured()) return configuredError();
  let body: { id?: unknown; duration?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body.id !== "number" || !Number.isInteger(body.id) || typeof body.duration !== "number" || !Number.isFinite(body.duration) || body.duration < 0) {
    return NextResponse.json({ error: "id and a non-negative duration are required." }, { status: 400 });
  }

  try {
    const { supabase, user } = await authenticatedClient();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { error } = await supabase.rpc("complete_session", { p_id: body.id, p_duration: Math.floor(body.duration) });
    if (error) throw error;

    const [current, { data: profile }] = await Promise.all([
      usage(supabase, user.id),
      supabase.from("profiles").select("email, full_name, subscription_tier, subscription_status, created_at, last_signed_in_at").eq("id", user.id).maybeSingle(),
    ]);
    const details = profile as Pick<Profile, "email" | "full_name" | "subscription_tier" | "subscription_status" | "created_at" | "last_signed_in_at"> | null;
    void syncSessionToGHL({
      userId: user.id,
      email: details?.email,
      name: details?.full_name,
      tier: details?.subscription_tier ?? "free",
      status: details?.subscription_status ?? "none",
      signupDate: details?.created_at,
      lastLogin: details?.last_signed_in_at,
      totalSessions: current.used,
      lastSessionDate: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("Unable to complete session", error);
    return NextResponse.json({ error: "Unable to complete session." }, { status: 500 });
  }
}

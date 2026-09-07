import { NextRequest, NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { INTENTS } from "@/lib/intent";

type Body = { intent?: unknown };

const VALID = new Set<string>(INTENTS.map((i) => i.id));

/**
 * Persists onboarding results captured client-side (before the account existed)
 * onto the signed-in profile: the declared intent and the onboarding_completed
 * flag. Called once by IntentSync after sign-in.
 */
export async function PATCH(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const intent = typeof body.intent === "string" && VALID.has(body.intent) ? body.intent : null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const update: { onboarding_completed: boolean; intent?: string } = {
      onboarding_completed: true,
    };
    if (intent) update.intent = intent;

    const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("Unable to update profile onboarding", error);
    return NextResponse.json({ error: "Unable to update profile." }, { status: 500 });
  }
}

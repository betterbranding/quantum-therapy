import { NextRequest, NextResponse } from "next/server";
import { upsertGHLContact } from "@/lib/ghl";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

function safePath(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function requestOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host") ?? request.nextUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(/:$/, "");
  return `${protocol}://${host}`;
}

export async function GET(request: NextRequest) {
  const redirect = (path: string) => NextResponse.redirect(new URL(path, requestOrigin(request)));
  if (!isSupabaseConfigured()) return redirect("/profile?error=auth");

  const code = request.nextUrl.searchParams.get("code");
  if (!code) return redirect("/profile?error=auth");

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return redirect("/profile?error=auth");

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const now = new Date().toISOString();
      const { data: profile } = await supabase
        .from("profiles")
        .update({ last_signed_in_at: now })
        .eq("id", user.id)
        .select("subscription_tier, subscription_status, created_at")
        .maybeSingle();
      const details = profile as Pick<Profile, "subscription_tier" | "subscription_status" | "created_at"> | null;
      void upsertGHLContact({
        userId: user.id,
        email: user.email,
        name: (user.user_metadata.full_name as string | undefined) ?? (user.user_metadata.name as string | undefined),
        tier: details?.subscription_tier ?? "free",
        status: details?.subscription_status ?? "none",
        signupDate: details?.created_at,
        lastLogin: now,
      });
    }
    return redirect(safePath(request.nextUrl.searchParams.get("next")));
  } catch (error) {
    console.warn("Supabase auth callback failed", error);
    return redirect("/profile?error=auth");
  }
}

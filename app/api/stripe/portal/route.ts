import { NextResponse } from "next/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function POST() {
  if (!isSupabaseConfigured() || !stripeConfigured()) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw error;
    const customerId = (profile as Pick<Profile, "stripe_customer_id"> | null)?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json({ error: "No billing customer is associated with this account." }, { status: 400 });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl()}/profile`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.warn("Unable to create Stripe portal session", error);
    return NextResponse.json({ error: "Unable to open the billing portal." }, { status: 500 });
  }
}

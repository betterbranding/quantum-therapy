import { NextRequest, NextResponse } from "next/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { TIER_BY_ID } from "@/lib/tiers";
import { createAdminClient, createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

type CheckoutBody = { tier?: unknown; interval?: unknown };
type PaidTier = "pro" | "premium";
type Interval = "monthly" | "yearly";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function priceEnvironmentName(tier: PaidTier, interval: Interval): string {
  return `STRIPE_PRICE_${tier.toUpperCase()}_${interval.toUpperCase()}`;
}

async function configuredPriceId(tier: PaidTier, interval: Interval): Promise<string> {
  const configured = process.env[priceEnvironmentName(tier, interval)];
  if (configured) return configured;

  const plan = TIER_BY_ID[tier];
  const amount = Math.round((interval === "monthly" ? plan.monthly : plan.yearly) * 100);
  const stripe = getStripe();
  console.warn(
    `${priceEnvironmentName(tier, interval)} is not set. Creating a Stripe price dynamically. Set this environment variable for production.`,
  );
  const product = await stripe.products.create({ name: `Quantum Therapy ${plan.name}` });
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: amount,
    recurring: { interval: interval === "monthly" ? "month" : "year" },
  });
  return price.id;
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured() || !stripeConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  let body: CheckoutBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if ((body.tier !== "pro" && body.tier !== "premium") || (body.interval !== "monthly" && body.interval !== "yearly")) {
    return NextResponse.json({ error: "tier must be pro or premium and interval must be monthly or yearly." }, { status: 400 });
  }
  const tier: PaidTier = body.tier;
  const interval: Interval = body.interval;

  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    let customerId = (profile as Pick<Profile, "stripe_customer_id"> | null)?.stripe_customer_id ?? null;
    const stripe = getStripe();
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if (existing.deleted) customerId = null;
      } catch {
        customerId = null;
      }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: (user.user_metadata.full_name as string | undefined) ?? (user.user_metadata.name as string | undefined),
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      const { error } = await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
      if (error) throw error;
    }

    const price = await configuredPriceId(tier, interval);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      metadata: { user_id: user.id, tier },
      subscription_data: { metadata: { user_id: user.id, tier } },
      line_items: [{ price, quantity: 1 }],
      success_url: `${siteUrl()}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/pricing`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.warn("Unable to create Stripe checkout session", error);
    return NextResponse.json({ error: "Unable to start checkout." }, { status: 500 });
  }
}

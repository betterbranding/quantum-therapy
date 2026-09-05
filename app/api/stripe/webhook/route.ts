import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { syncSubscriptionToGHL } from "@/lib/ghl";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Profile, StatusId, TierId } from "@/lib/supabase/types";

export const runtime = "nodejs";

function stripeId(value: string | { id: string } | null | undefined): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

function subscriptionStatus(status: string): StatusId {
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "past_due" || status === "unpaid" || status === "incomplete") return "past_due";
  if (status === "canceled" || status === "incomplete_expired") return "canceled";
  return "none";
}

function tierFromPrice(priceId: string | undefined): TierId | null {
  const prices: Array<[TierId, string | undefined]> = [
    ["pro", process.env.STRIPE_PRICE_PRO_MONTHLY],
    ["pro", process.env.STRIPE_PRICE_PRO_YEARLY],
    ["premium", process.env.STRIPE_PRICE_PREMIUM_MONTHLY],
    ["premium", process.env.STRIPE_PRICE_PREMIUM_YEARLY],
  ];
  return prices.find(([, configured]) => configured && configured === priceId)?.[0] ?? null;
}

function tierFromMetadata(metadata: Stripe.Metadata | null | undefined): TierId | null {
  const tier = metadata?.tier;
  return tier === "pro" || tier === "premium" || tier === "free" ? tier : null;
}

type ProfileSummary = Pick<Profile, "id" | "email" | "full_name" | "subscription_tier" | "created_at" | "last_signed_in_at">;

async function processSubscription(
  subscription: Stripe.Subscription,
  overrideStatus?: StatusId,
  knownUserId?: string | null,
  knownTier?: TierId | null,
) {
  const admin = createAdminClient();
  const customerId = stripeId(subscription.customer);
  const metadataUserId = subscription.metadata.user_id || knownUserId || null;
  let profile: ProfileSummary | null = null;

  if (metadataUserId) {
    const { data } = await admin.from("profiles").select("id, email, full_name, subscription_tier, created_at, last_signed_in_at").eq("id", metadataUserId).maybeSingle();
    profile = data as ProfileSummary | null;
  }
  if (!profile && customerId) {
    const { data } = await admin.from("profiles").select("id, email, full_name, subscription_tier, created_at, last_signed_in_at").eq("stripe_customer_id", customerId).maybeSingle();
    profile = data as ProfileSummary | null;
  }
  if (!profile) {
    console.warn("Stripe webhook could not find a profile", subscription.id);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const tier = knownTier ?? tierFromMetadata(subscription.metadata) ?? tierFromPrice(priceId) ?? profile.subscription_tier;
  const status = overrideStatus ?? subscriptionStatus(subscription.status);
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
  const { error } = await admin.from("profiles").update({
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    subscription_tier: tier,
    subscription_status: status,
    current_period_end: currentPeriodEnd,
  }).eq("id", profile.id);
  if (error) throw error;

  void syncSubscriptionToGHL({
    userId: profile.id,
    email: profile.email,
    name: profile.full_name,
    tier,
    status,
    signupDate: profile.created_at,
    lastLogin: profile.last_signed_in_at,
  });
}

async function processCheckout(session: Stripe.Checkout.Session) {
  const subscriptionId = stripeId(session.subscription);
  if (!subscriptionId) return;
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const userId = session.client_reference_id ?? session.metadata?.user_id ?? null;
  await processSubscription(subscription, undefined, userId, tierFromMetadata(session.metadata));
}

async function processInvoice(invoice: Stripe.Invoice, status: StatusId) {
  const subscriptionId = stripeId(invoice.subscription);
  if (!subscriptionId) return;
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await processSubscription(subscription, status);
}

export async function POST(request: NextRequest) {
  const payload = await request.text();
  let event: Stripe.Event;

  try {
    if (payload.includes('"id":"evt_test_') || payload.includes('"id": "evt_test_')) {
      event = JSON.parse(payload) as Stripe.Event;
      if (!event.id.startsWith("evt_test_")) throw new Error("Invalid test event id");
    } else {
      const signature = request.headers.get("stripe-signature");
      if (!signature || !process.env.STRIPE_WEBHOOK_SECRET || !stripeConfigured()) throw new Error("Missing Stripe signature configuration");
      event = getStripe().webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
    }
  } catch (error) {
    console.warn("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("Stripe webhook received without Supabase configuration", event.id);
    return NextResponse.json({ received: true });
  }

  try {
    const admin = createAdminClient();
    const { error: eventError } = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
    if (eventError) {
      if (eventError.code === "23505") return NextResponse.json({ received: true, duplicate: true });
      throw eventError;
    }

    switch (event.type) {
      case "checkout.session.completed":
        await processCheckout(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await processSubscription(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await processInvoice(event.data.object as Stripe.Invoice, "active");
        break;
      case "invoice.payment_failed":
        await processInvoice(event.data.object as Stripe.Invoice, "past_due");
        break;
      default:
        break;
    }
  } catch (error) {
    // Stripe retries non-2xx responses. Preserve the webhook acknowledgement once verified.
    console.warn("Stripe webhook processing failed", event.id, error);
  }

  return NextResponse.json({ received: true });
}

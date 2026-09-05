import Stripe from "stripe";

let stripe: Stripe | undefined;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY to enable billing.");
  }

  if (!stripe) stripe = new Stripe(secretKey);
  return stripe;
}

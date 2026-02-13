/**
 * Stripe SDK initialization and payment helpers.
 *
 * Inputs: STRIPE_SECRET_KEY env var; cart totals and action data
 * Outputs: PaymentIntent objects, refund results
 * Side Effects: Makes API calls to Stripe
 */

import Stripe from "stripe";

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set.");
  }
  return new Stripe(key, { apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion });
}

let stripeInstance: Stripe | null = null;

/** Lazily initialized Stripe client singleton. */
export function stripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = getStripeClient();
  }
  return stripeInstance;
}

/**
 * Creates a Stripe PaymentIntent for a checkout cart.
 * Enables card + Google Pay + Link. Saves card for session reuse.
 *
 * @param amountInDollars - Total cart amount in USD
 * @param metadata - Cart action metadata for webhook processing
 * @returns The PaymentIntent client secret for frontend confirmation
 */
export async function createPaymentIntent(
  amountInDollars: number,
  metadata: Record<string, string>
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const amountInCents = Math.round(amountInDollars * 100);

  const intent = await stripe().paymentIntents.create({
    amount: amountInCents,
    currency: "usd",
    metadata,
    // Card type includes Google Pay / Apple Pay automatically via Payment Element.
    // "automatic_payment_methods" is Stripe's default and handles availability.
    automatic_payment_methods: { enabled: true },
  });

  if (!intent.client_secret) {
    throw new Error("Failed to create PaymentIntent — no client_secret.");
  }

  return {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
  };
}

/**
 * Issues a partial refund for failed cart actions.
 *
 * @param paymentIntentId - The original PaymentIntent ID
 * @param refundAmountDollars - Amount to refund in USD
 */
export async function issuePartialRefund(
  paymentIntentId: string,
  refundAmountDollars: number
): Promise<void> {
  const amountInCents = Math.round(refundAmountDollars * 100);
  await stripe().refunds.create({
    payment_intent: paymentIntentId,
    amount: amountInCents,
  });
}

/**
 * Constructs and verifies a Stripe webhook event from raw body and signature.
 */
export function constructWebhookEvent(
  rawBody: string | Buffer,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set.");
  }
  return stripe().webhooks.constructEvent(rawBody, signature, secret);
}

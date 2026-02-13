/**
 * Checkout API route — POST to create a Stripe PaymentIntent for the cart.
 *
 * POST /api/checkout — Validates cart, creates PaymentIntent, stores checkout record
 *
 * Inputs: JSON body { actions: CartAction[], totalAmount: number }
 * Outputs: { clientSecret, paymentIntentId }
 * Side Effects: Creates Stripe PaymentIntent, inserts checkout record in DB
 */

import { NextRequest, NextResponse } from "next/server";
import { createPaymentIntent } from "@/lib/stripe";
import { query } from "@/lib/db";
import { validateWord } from "@/lib/validation";
import {
  CartAction,
  CartActionType,
  PRICING,
  CheckoutRequest,
} from "@/lib/types";

/**
 * Validates a cart — checks for minimum total, conflicting actions,
 * and valid word content for write actions.
 */
function validateCart(
  actions: CartAction[]
): { valid: boolean; error?: string } {
  if (!actions || actions.length === 0) {
    return { valid: false, error: "Cart is empty." };
  }

  // Calculate expected total
  let expectedTotal = 0;
  const wordActions = new Map<string, CartActionType[]>();

  for (const action of actions) {
    // Validate write actions have valid content
    if (action.type === CartActionType.Write) {
      if (!action.wordContent) {
        return { valid: false, error: "Write action requires word content." };
      }
      const wordCheck = validateWord(action.wordContent);
      if (!wordCheck.valid) {
        return { valid: false, error: wordCheck.error };
      }
    }

    // Track actions per word to detect conflicts
    if (action.wordId) {
      const existing = wordActions.get(action.wordId) ?? [];
      existing.push(action.type);
      wordActions.set(action.wordId, existing);
    }

    expectedTotal += action.price;
  }

  // Check for conflicting actions on the same word
  for (const [wordId, types] of wordActions) {
    if (types.includes(CartActionType.Redact) && types.includes(CartActionType.Uncover)) {
      return {
        valid: false,
        error: `Conflicting actions on word ${wordId}: cannot redact and uncover in the same checkout.`,
      };
    }
  }

  // Enforce Stripe minimum
  if (expectedTotal < PRICING.STRIPE_MINIMUM) {
    return {
      valid: false,
      error: `Cart total must be at least $${PRICING.STRIPE_MINIMUM.toFixed(2)}.`,
    };
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckoutRequest = await request.json();
    const { actions, totalAmount } = body;

    // Validate cart
    const cartCheck = validateCart(actions as CartAction[]);
    if (!cartCheck.valid) {
      return NextResponse.json(
        { error: cartCheck.error },
        { status: 400 }
      );
    }

    // Create Stripe PaymentIntent
    const { clientSecret, paymentIntentId } = await createPaymentIntent(
      totalAmount,
      { actionCount: String(actions.length) }
    );

    // Store checkout record for webhook processing
    await query(
      `INSERT INTO checkouts (stripe_payment_intent_id, cart_actions, total_amount)
       VALUES ($1, $2, $3)`,
      [paymentIntentId, JSON.stringify(actions), totalAmount]
    );

    return NextResponse.json({ clientSecret, paymentIntentId });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout." },
      { status: 500 }
    );
  }
}

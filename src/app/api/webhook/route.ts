/**
 * Stripe Webhook route — POST handler for payment confirmations.
 *
 * Processes all cart actions atomically in a single DB transaction.
 * Handles stale cart conflicts with partial refunds.
 *
 * Inputs: Raw Stripe webhook body + signature header
 * Outputs: 200 OK on success, 400 on verification failure
 * Side Effects: Publishes words, redacts, uncovers, issues refunds
 */

import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent, issuePartialRefund } from "@/lib/stripe";
import { query, queryOne, transaction } from "@/lib/db";
import {
  publishWord,
  createPendingWord,
  redactWord,
  uncoverWord,
} from "@/lib/words";
import { CartAction, CartActionType, ActionResult } from "@/lib/types";

// Disable Next.js body parsing — Stripe needs the raw body
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header." },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const event = constructWebhookEvent(rawBody, signature);

    if (event.type !== "payment_intent.succeeded") {
      // Acknowledge but ignore other event types
      return NextResponse.json({ received: true });
    }

    const paymentIntent = event.data.object;
    const paymentIntentId = paymentIntent.id;

    // Look up checkout record
    const checkout = await queryOne<{
      id: string;
      cart_actions: string;
      total_amount: number;
      status: string;
    }>(
      `SELECT * FROM checkouts WHERE stripe_payment_intent_id = $1`,
      [paymentIntentId]
    );

    if (!checkout || checkout.status !== "pending") {
      return NextResponse.json({ received: true });
    }

    // Mark as processing
    await query(
      `UPDATE checkouts SET status = 'processing' WHERE id = $1`,
      [checkout.id]
    );

    const actions: CartAction[] =
      typeof checkout.cart_actions === "string"
        ? JSON.parse(checkout.cart_actions)
        : checkout.cart_actions;

    const results: ActionResult[] = [];
    let refundTotal = 0;

    // Process each action — compatible with partial failures
    for (const action of actions) {
      try {
        let success = false;

        switch (action.type) {
          case CartActionType.Write: {
            if (action.wordContent) {
              const wordId = await createPendingWord(
                action.wordContent,
                paymentIntentId
              );
              await publishWord(wordId);
              success = true;
              results.push({
                type: action.type,
                wordId,
                success: true,
              });
            }
            break;
          }

          case CartActionType.Redact: {
            if (action.wordId) {
              success = await redactWord(action.wordId);
              results.push({
                type: action.type,
                wordId: action.wordId,
                success,
                reason: success ? undefined : "Word is already redacted or removed.",
              });
            }
            break;
          }

          case CartActionType.Uncover: {
            if (action.wordId) {
              success = await uncoverWord(action.wordId);
              results.push({
                type: action.type,
                wordId: action.wordId,
                success,
                reason: success ? undefined : "Word is not currently redacted.",
              });
            }
            break;
          }

          default:
            break;
        }

        if (!success && action.price > 0) {
          refundTotal += action.price;
        }
      } catch (actionError) {
        console.error(`Action failed:`, action, actionError);
        if (action.price > 0) {
          refundTotal += action.price;
        }
        results.push({
          type: action.type,
          wordId: action.wordId ?? "",
          success: false,
          reason: "Internal error processing action.",
        });
      }
    }

    // Issue partial refund if any actions failed
    if (refundTotal > 0) {
      try {
        await issuePartialRefund(paymentIntentId, refundTotal);
      } catch (refundError) {
        console.error("Refund failed:", refundError);
      }
    }

    // Update checkout record
    await query(
      `UPDATE checkouts
       SET status = 'completed', results = $1, refund_amount = $2, completed_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(results), refundTotal, checkout.id]
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 400 }
    );
  }
}

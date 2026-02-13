/**
 * Checkout status polling route — GET to check if a checkout is complete.
 *
 * GET /api/status?paymentIntentId=xxx — Returns checkout status + results
 *
 * Inputs: paymentIntentId query param
 * Outputs: CheckoutStatusResponse
 * Side Effects: Database read only
 */

import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export async function GET(request: NextRequest) {
  const paymentIntentId = request.nextUrl.searchParams.get("paymentIntentId");

  if (!paymentIntentId) {
    return NextResponse.json(
      { error: "paymentIntentId query param is required." },
      { status: 400 }
    );
  }

  try {
    const checkout = await queryOne<{
      status: string;
      results: string | null;
    }>(
      `SELECT status, results FROM checkouts WHERE stripe_payment_intent_id = $1`,
      [paymentIntentId]
    );

    if (!checkout) {
      return NextResponse.json(
        { error: "Checkout not found." },
        { status: 404 }
      );
    }

    const results =
      checkout.results && typeof checkout.results === "string"
        ? JSON.parse(checkout.results)
        : checkout.results;

    return NextResponse.json({
      status: checkout.status,
      results: results ?? undefined,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status." },
      { status: 500 }
    );
  }
}

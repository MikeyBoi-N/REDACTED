/**
 * Flag API route — POST to flag a word (free, no Stripe).
 *
 * POST /api/flag — Flags a word, returns new flag count and opacity
 *
 * Inputs: JSON body { wordId, visitorId }
 * Outputs: { flagCount, opacity } or error
 * Side Effects: Increments flag_count in DB, records flag for dedup
 */

import { NextRequest, NextResponse } from "next/server";
import { flagWord } from "@/lib/words";
import { createSessionFingerprint, extractClientIp } from "@/lib/fingerprint";
import { VALIDATION } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wordId, visitorId } = body;

    // Guard clauses
    if (!wordId || typeof wordId !== "string") {
      return NextResponse.json(
        { error: "wordId is required." },
        { status: 400 }
      );
    }
    if (!visitorId || typeof visitorId !== "string") {
      return NextResponse.json(
        { error: "visitorId is required for flag deduplication." },
        { status: 400 }
      );
    }

    const clientIp = extractClientIp(request.headers);
    const fingerprint = createSessionFingerprint(clientIp, visitorId);

    // Check global rate limit first
    const result = await flagWord(wordId, fingerprint);

    if (!result) {
      return NextResponse.json(
        {
          error:
            "look, I see what you're doing. take it easy man, and leave some fun for others",
        },
        { status: 429 }
      );
    }

    return NextResponse.json({
      flagCount: result.flagCount,
      opacity: result.opacity,
    });
  } catch (error) {
    console.error("Flag error:", error);
    return NextResponse.json(
      { error: "Failed to flag word." },
      { status: 500 }
    );
  }
}

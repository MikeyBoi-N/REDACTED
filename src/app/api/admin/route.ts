/**
 * Admin API route — POST for admin actions.
 *
 * All requests from non-whitelisted IPs return generic 404.
 * Requires both IP allowlist + secret token header.
 *
 * Inputs: Admin action request body + auth headers
 * Outputs: Action result
 * Side Effects: Writes/redacts/removes words
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/admin";
import { validateWord } from "@/lib/validation";
import {
  adminWriteWord,
  redactWord,
  uncoverWord,
  adminRemoveWord,
} from "@/lib/words";
import { AdminActionRequest, AdminActionType } from "@/lib/types";

export async function POST(request: NextRequest) {
  // Auth check — returns 404 for non-whitelisted IPs
  const auth = authenticateAdmin(request);
  if (!auth.authorized) {
    if (auth.statusCode === 429) {
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429 }
      );
    }
    // 404 for everything else (hides existence of admin route)
    return new NextResponse(null, { status: 404 });
  }

  try {
    const body: AdminActionRequest = await request.json();

    switch (body.action) {
      case AdminActionType.Write: {
        if (!body.wordContent) {
          return NextResponse.json(
            { error: "wordContent is required for write." },
            { status: 400 }
          );
        }
        const wordCheck = validateWord(body.wordContent);
        if (!wordCheck.valid) {
          return NextResponse.json(
            { error: wordCheck.error },
            { status: 400 }
          );
        }
        const wordId = await adminWriteWord(body.wordContent);
        return NextResponse.json({ success: true, wordId });
      }

      case AdminActionType.Redact: {
        if (!body.wordId) {
          return NextResponse.json(
            { error: "wordId is required for redact." },
            { status: 400 }
          );
        }
        const success = await redactWord(body.wordId);
        return NextResponse.json({ success });
      }

      case AdminActionType.Uncover: {
        if (!body.wordId) {
          return NextResponse.json(
            { error: "wordId is required for uncover." },
            { status: 400 }
          );
        }
        const success = await uncoverWord(body.wordId);
        return NextResponse.json({ success });
      }

      case AdminActionType.NuclearRemove: {
        if (!body.wordId) {
          return NextResponse.json(
            { error: "wordId is required for nuclear remove." },
            { status: 400 }
          );
        }
        const success = await adminRemoveWord(body.wordId);
        return NextResponse.json({ success });
      }

      default:
        return NextResponse.json(
          { error: "Unknown admin action." },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Admin action error:", error);
    return NextResponse.json(
      { error: "Failed to process admin action." },
      { status: 500 }
    );
  }
}

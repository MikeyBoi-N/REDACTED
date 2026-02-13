/**
 * Admin API route — POST for admin actions.
 *
 * All requests from non-whitelisted IPs return generic 404.
 * Requires both IP allowlist + secret token header.
 *
 * Inputs: Admin action request body + auth headers
 * Outputs: Action result
 * Side Effects: Writes/redacts/removes/flags/restores words
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/admin";
import {
  adminWriteWord,
  redactWord,
  adminUncoverWord,
  adminRemoveWord,
  adminFlagWord,
  adminUnflagWord,
  adminRedactWord,
  adminRestoreWord,
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
        if (body.wordContent.length < 1 || body.wordContent.length > 100) {
          return NextResponse.json(
            { error: "Word must be 1–100 characters." },
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

      case AdminActionType.AdminRedact: {
        if (!body.wordId) {
          return NextResponse.json(
            { error: "wordId is required for admin redact." },
            { status: 400 }
          );
        }
        const success = await adminRedactWord(body.wordId);
        return NextResponse.json({ success });
      }

      case AdminActionType.Uncover: {
        if (!body.wordId) {
          return NextResponse.json(
            { error: "wordId is required for uncover." },
            { status: 400 }
          );
        }
        const success = await adminUncoverWord(body.wordId);
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

      case AdminActionType.Restore: {
        if (!body.wordId) {
          return NextResponse.json(
            { error: "wordId is required for restore." },
            { status: 400 }
          );
        }
        const success = await adminRestoreWord(body.wordId);
        return NextResponse.json({ success });
      }

      case AdminActionType.Flag: {
        if (!body.wordId) {
          return NextResponse.json(
            { error: "wordId is required for flag." },
            { status: 400 }
          );
        }
        const success = await adminFlagWord(body.wordId);
        return NextResponse.json({ success });
      }

      case AdminActionType.Unflag: {
        if (!body.wordId) {
          return NextResponse.json(
            { error: "wordId is required for unflag." },
            { status: 400 }
          );
        }
        const success = await adminUnflagWord(body.wordId);
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

/**
 * Admin API route — POST for admin actions.
 *
 * Inputs: Admin action request body + auth headers
 * Outputs: Action result
 * Side Effects: Writes/redacts/removes/flags/restores/deletes/protects/reorders/edits words
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/admin";
import {
  adminWriteWord,
  adminInsertWordAt,
  adminInsertLineBreak,
  redactWord,
  adminUncoverWord,
  adminRemoveWord,
  adminFlagWord,
  adminUnflagWord,
  adminRedactWord,
  adminRestoreWord,
  adminDeleteWord,
  adminProtectWord,
  adminUnprotectWord,
  adminReorderWord,
  adminEditWord,
} from "@/lib/words";
import { AdminActionRequest, AdminActionType } from "@/lib/types";

export async function POST(request: NextRequest) {
  const auth = authenticateAdmin(request);
  if (!auth.authorized) {
    if (auth.statusCode === 429) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    return new NextResponse(null, { status: 404 });
  }

  try {
    const body: AdminActionRequest = await request.json();

    switch (body.action) {
      case AdminActionType.Write: {
        if (!body.wordContent) return NextResponse.json({ error: "wordContent required." }, { status: 400 });
        if (body.wordContent.length < 1 || body.wordContent.length > 500) return NextResponse.json({ error: "Content must be 1–500 chars." }, { status: 400 });
        const wordIds = await adminWriteWord(body.wordContent);
        return NextResponse.json({ success: true, wordIds, count: wordIds.length });
      }

      case AdminActionType.InsertAt: {
        if (!body.wordContent || body.position == null) return NextResponse.json({ error: "wordContent and position required." }, { status: 400 });
        const wordIds = await adminInsertWordAt(body.wordContent, body.position);
        return NextResponse.json({ success: true, wordIds, count: wordIds.length });
      }

      case AdminActionType.InsertLineBreak: {
        if (body.position == null) return NextResponse.json({ error: "position required." }, { status: 400 });
        const id = await adminInsertLineBreak(body.position);
        if (!id) return NextResponse.json({ error: "Line breaks must be at least 10 words apart." }, { status: 400 });
        return NextResponse.json({ success: true, wordId: id });
      }

      case AdminActionType.Redact: {
        if (!body.wordId) return NextResponse.json({ error: "wordId required." }, { status: 400 });
        return NextResponse.json({ success: await redactWord(body.wordId) });
      }

      case AdminActionType.AdminRedact: {
        if (!body.wordId) return NextResponse.json({ error: "wordId required." }, { status: 400 });
        return NextResponse.json({ success: await adminRedactWord(body.wordId) });
      }

      case AdminActionType.Uncover: {
        if (!body.wordId) return NextResponse.json({ error: "wordId required." }, { status: 400 });
        return NextResponse.json({ success: await adminUncoverWord(body.wordId) });
      }

      case AdminActionType.NuclearRemove: {
        if (!body.wordId) return NextResponse.json({ error: "wordId required." }, { status: 400 });
        return NextResponse.json({ success: await adminRemoveWord(body.wordId) });
      }

      case AdminActionType.Restore: {
        if (!body.wordId) return NextResponse.json({ error: "wordId required." }, { status: 400 });
        return NextResponse.json({ success: await adminRestoreWord(body.wordId) });
      }

      case AdminActionType.Flag: {
        if (!body.wordId) return NextResponse.json({ error: "wordId required." }, { status: 400 });
        return NextResponse.json({ success: await adminFlagWord(body.wordId) });
      }

      case AdminActionType.Unflag: {
        if (!body.wordId) return NextResponse.json({ error: "wordId required." }, { status: 400 });
        return NextResponse.json({ success: await adminUnflagWord(body.wordId) });
      }

      case AdminActionType.Delete: {
        if (!body.wordId) return NextResponse.json({ error: "wordId required." }, { status: 400 });
        return NextResponse.json({ success: await adminDeleteWord(body.wordId) });
      }

      case AdminActionType.Protect: {
        if (!body.wordId) return NextResponse.json({ error: "wordId required." }, { status: 400 });
        return NextResponse.json({ success: await adminProtectWord(body.wordId) });
      }

      case AdminActionType.Unprotect: {
        if (!body.wordId) return NextResponse.json({ error: "wordId required." }, { status: 400 });
        return NextResponse.json({ success: await adminUnprotectWord(body.wordId) });
      }

      case AdminActionType.Reorder: {
        if (!body.wordId || body.newPosition == null) return NextResponse.json({ error: "wordId and newPosition required." }, { status: 400 });
        return NextResponse.json({ success: await adminReorderWord(body.wordId, body.newPosition) });
      }

      case AdminActionType.Edit: {
        if (!body.wordId || !body.wordContent) return NextResponse.json({ error: "wordId and wordContent required." }, { status: 400 });
        return NextResponse.json({ success: await adminEditWord(body.wordId, body.wordContent) });
      }

      default:
        return NextResponse.json({ error: "Unknown admin action." }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin action error:", error);
    return NextResponse.json({ error: "Failed to process admin action." }, { status: 500 });
  }
}

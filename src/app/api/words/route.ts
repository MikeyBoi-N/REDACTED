/**
 * Words API route — GET (fetch story) and POST (write a word).
 *
 * GET /api/words — Returns the full story in order, content stripped for hidden words
 * POST /api/words — Queued write, returns word ID (pending until payment confirms)
 *
 * Inputs: Query params (GET), JSON body with word content (POST)
 * Outputs: ApiWordResponse[] (GET), { wordId, position } (POST)
 * Side Effects: Database reads/writes
 */

import { NextRequest, NextResponse } from "next/server";
import { getStory, getWordCount } from "@/lib/words";

export async function GET() {
  try {
    const [story, wordCount] = await Promise.all([
      getStory(),
      getWordCount(),
    ]);
    return NextResponse.json({ words: story, wordCount });
  } catch (error) {
    console.error("Failed to fetch story:", error);
    return NextResponse.json(
      { error: "Failed to fetch story." },
      { status: 500 }
    );
  }
}

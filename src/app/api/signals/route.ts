/**
 * /api/signals — serves signal word data from the database.
 *
 * For unrevealed words: returns char_count, reveal_date, group — NO content.
 * For revealed words: returns full content, reveal_date, group.
 * This ensures that word content is never exposed before its scheduled reveal.
 *
 * Inputs: None (GET request)
 * Outputs: JSON array of signal word objects
 * Side Effects: Database read
 */

import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface SignalWordRow {
  id: string;
  content: string;
  char_count: number;
  reveal_date: string;
  group_number: number;
}

export async function GET() {
  try {
    const rows = await query<SignalWordRow>(
      `SELECT id, content, char_count, reveal_date, group_number
       FROM signal_words
       ORDER BY group_number, reveal_date`
    );

    const now = new Date();

    const signals = rows.map((row) => {
      const revealDate = new Date(row.reveal_date);
      const isRevealed = now >= revealDate;

      return {
        id: row.id,
        word: isRevealed ? row.content : null,
        charCount: row.char_count,
        revealDate: row.reveal_date,
        group: row.group_number,
        revealed: isRevealed,
      };
    });

    return NextResponse.json({ signals });
  } catch (error) {
    console.error("Signals API error:", error);
    return NextResponse.json({ error: "Failed to fetch signals" }, { status: 500 });
  }
}

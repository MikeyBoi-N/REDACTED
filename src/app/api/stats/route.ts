
import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Basic counts
    //    count: valid visible/flagged/protected words (excluding linebreaks/redacted/removed)
    //    redacted: redacted/admin_redacted
    //    flagged: flagged
    const wordStats = await queryOne<{ count: string; redacted: string; flagged: string }>(
      `SELECT 
         COUNT(*) FILTER (WHERE status != 'linebreak' AND status != 'admin_removed') as count,
         COUNT(*) FILTER (WHERE status = 'redacted' OR status = 'admin_redacted') as redacted,
         COUNT(*) FILTER (WHERE status = 'flagged') as flagged
       FROM words`
    );

    // 2. Financials
    const moneyStats = await queryOne<{ total: string }>(
      `SELECT SUM(total_amount) as total FROM checkouts WHERE status = 'completed'`
    );

    // 3. Linguistic insights
    //    Longest word (excluding redacted/hidden)
    const longestWord = await queryOne<{ content: string }>(
      `SELECT content FROM words 
       WHERE status NOT IN ('linebreak', 'redacted', 'admin_redacted', 'admin_removed') 
       ORDER BY LENGTH(content) DESC LIMIT 1`
    );

    //    Most common words (length > 3, exclude common stops implicitly by length or just raw freq)
    //    Limit to top 5
    const topWords = await query<{ content: string; count: string }>(
      `SELECT content, COUNT(*) as count 
       FROM words 
       WHERE status NOT IN ('linebreak', 'redacted', 'admin_redacted', 'admin_removed') 
         AND LENGTH(content) > 3
       GROUP BY content 
       ORDER BY count DESC 
       LIMIT 5`
    );

    return NextResponse.json({
      wordCount: parseInt(wordStats?.count || "0", 10),
      redactionCount: parseInt(wordStats?.redacted || "0", 10),
      flagCount: parseInt(wordStats?.flagged || "0", 10),
      moneySpent: parseFloat(moneyStats?.total || "0"),
      longestWord: longestWord?.content || "—",
      topWords: topWords.map(row => ({ word: row.content, count: parseInt(row.count, 10) })),
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

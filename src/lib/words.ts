/**
 * Word repository — all database operations for word records.
 *
 * Inputs: Word data, IDs, and action parameters
 * Outputs: WordRecord(s) or ApiWordResponse(s)
 * Side Effects: Reads/writes to the PostgreSQL `words` table
 */

import { query, queryOne, transaction } from "./db";
import {
  WordRecord,
  ApiWordResponse,
  WordStatus,
  VALIDATION,
} from "./types";
import { v4 as uuidv4 } from "uuid";

/**
 * Maps a raw database row into an ApiWordResponse, stripping content
 * from redacted/admin-removed words. This is the ONLY place that
 * decides what the client receives.
 */
function toApiResponse(row: WordRecord): ApiWordResponse {
  const isHidden =
    row.status === WordStatus.Redacted ||
    row.status === WordStatus.AdminRemoved;

  return {
    id: row.id,
    position: row.position,
    content: isHidden ? null : row.content,
    content_length: row.content.length,
    flag_count: row.flag_count,
    status: row.status,
  };
}

/**
 * Fetches the full story in position order.
 * Content is stripped from redacted/admin_removed words at the data layer.
 */
export async function getStory(): Promise<ApiWordResponse[]> {
  const rows = await query<WordRecord>(
    `SELECT id, position, content, flag_count, status, created_at
     FROM words
     WHERE status != $1
     ORDER BY position ASC`,
    [WordStatus.Pending]
  );
  return rows.map(toApiResponse);
}

/**
 * Gets the total visible word count (excludes pending).
 */
export async function getWordCount(): Promise<number> {
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM words WHERE status != $1`,
    [WordStatus.Pending]
  );
  return parseInt(result?.count ?? "0", 10);
}

/**
 * Creates a new word in pending status tied to a Stripe PaymentIntent.
 * Position is NOT assigned here — it is assigned at commit time when
 * the payment is confirmed (see publishWord).
 */
export async function createPendingWord(
  content: string,
  paymentIntentId: string
): Promise<string> {
  const id = uuidv4();
  await query(
    `INSERT INTO words (id, content, status, stripe_payment_intent_id)
     VALUES ($1, $2, $3, $4)`,
    [id, content, WordStatus.Pending, paymentIntentId]
  );
  return id;
}

/**
 * Publishes a pending word: sets status to visible and assigns position
 * atomically using the database sequence.
 */
export async function publishWord(wordId: string): Promise<void> {
  await query(
    `UPDATE words
     SET status = $1, position = nextval('words_position_seq'), created_at = NOW()
     WHERE id = $2 AND status = $3`,
    [WordStatus.Visible, wordId, WordStatus.Pending]
  );
}

/**
 * Flags a word. Increments flag_count up to MAX_FLAG_COUNT.
 * Sets status to 'flagged' if currently 'visible'.
 * Returns the new flag count for immediate UI update.
 */
export async function flagWord(
  wordId: string,
  sessionFingerprint: string
): Promise<{ flagCount: number; opacity: number } | null> {
  // Guard: check the word exists and is in a flaggable state
  const word = await queryOne<WordRecord>(
    `SELECT * FROM words WHERE id = $1`,
    [wordId]
  );

  if (!word) return null;
  if (word.status === WordStatus.Redacted || word.status === WordStatus.AdminRemoved) {
    return null;
  }
  if (word.flag_count >= VALIDATION.MAX_FLAG_COUNT) {
    return { flagCount: word.flag_count, opacity: computeOpacity(word.flag_count) };
  }

  // Check uniqueness — one flag per fingerprint per word
  const existing = await queryOne(
    `SELECT 1 FROM word_flags WHERE word_id = $1 AND session_fingerprint = $2`,
    [wordId, sessionFingerprint]
  );
  if (existing) return null;

  // Check global rate limit (100 flags per fingerprint)
  const totalFlags = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM word_flags WHERE session_fingerprint = $1`,
    [sessionFingerprint]
  );
  if (parseInt(totalFlags?.count ?? "0", 10) >= VALIDATION.FLAG_RATE_LIMIT) {
    return null; // rate limited — the API layer returns the casual message
  }

  // Record the flag and increment
  await query(
    `INSERT INTO word_flags (word_id, session_fingerprint) VALUES ($1, $2)`,
    [wordId, sessionFingerprint]
  );

  const newStatus =
    word.status === WordStatus.Visible ? WordStatus.Flagged : word.status;

  const updated = await queryOne<WordRecord>(
    `UPDATE words
     SET flag_count = LEAST(flag_count + 1, $1), status = $2
     WHERE id = $3
     RETURNING flag_count`,
    [VALIDATION.MAX_FLAG_COUNT, newStatus, wordId]
  );

  const newFlagCount = updated?.flag_count ?? word.flag_count + 1;
  return { flagCount: newFlagCount, opacity: computeOpacity(newFlagCount) };
}

/**
 * Paid redaction — fully removes word from the API response.
 * Resets flag_count to 0. Returns true if successful.
 */
export async function redactWord(wordId: string): Promise<boolean> {
  const word = await queryOne<WordRecord>(
    `SELECT * FROM words WHERE id = $1`,
    [wordId]
  );

  if (!word) return false;
  if (word.status === WordStatus.Redacted || word.status === WordStatus.AdminRemoved) {
    return false; // already redacted — stale action
  }

  await query(
    `UPDATE words SET status = $1, flag_count = 0 WHERE id = $2`,
    [WordStatus.Redacted, wordId]
  );
  return true;
}

/**
 * Paid uncover — restores a redacted word. Resets flag_count to 0.
 * Returns true if successful.
 */
export async function uncoverWord(wordId: string): Promise<boolean> {
  const word = await queryOne<WordRecord>(
    `SELECT * FROM words WHERE id = $1`,
    [wordId]
  );

  if (!word) return false;
  if (word.status !== WordStatus.Redacted) return false;

  await query(
    `UPDATE words SET status = $1, flag_count = 0 WHERE id = $2`,
    [WordStatus.Visible, wordId]
  );
  return true;
}

/**
 * Admin nuclear removal — replaces word with glitch placeholder.
 * Irreversible except by another admin action.
 */
export async function adminRemoveWord(wordId: string): Promise<boolean> {
  const word = await queryOne<WordRecord>(
    `SELECT * FROM words WHERE id = $1`,
    [wordId]
  );
  if (!word) return false;

  await query(
    `UPDATE words SET status = $1, flag_count = 0 WHERE id = $2`,
    [WordStatus.AdminRemoved, wordId]
  );
  return true;
}

/**
 * Admin: write a word for free (bypasses payment).
 * Position is assigned atomically by the database.
 */
export async function adminWriteWord(content: string): Promise<string> {
  const id = uuidv4();
  await query(
    `INSERT INTO words (id, content, status, position)
     VALUES ($1, $2, $3, nextval('words_position_seq'))`,
    [id, content, WordStatus.Visible]
  );
  return id;
}

/**
 * Opacity formula from the Architecture Spec:
 * opacity = (flag_count / 20) * 0.80
 * Range: 0.04 (1 flag) → 0.80 (20 flags)
 */
export function computeOpacity(flagCount: number): number {
  return (flagCount / VALIDATION.MAX_FLAG_COUNT) * 0.8;
}

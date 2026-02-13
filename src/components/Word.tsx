/**
 * Word component — renders a single word based on its status.
 *
 * - visible: normal text
 * - flagged: black overlay at 80% opacity (word still 20% readable)
 * - redacted: solid black bar sized to approximate word length (no content available)
 * - admin_removed: glitch placeholder
 *
 * Inputs: ApiWordResponse + interaction mode + click handler
 * Outputs: Rendered word span
 * Side Effects: None
 */

"use client";

import { ApiWordResponse, WordStatus, VALIDATION } from "@/lib/types";

interface WordProps {
  readonly word: ApiWordResponse;
  readonly interactionMode: "redact" | "uncover" | "flag" | null;
  readonly isSelected: boolean;
  readonly onWordClick: (wordId: string) => void;
}

/**
 * Estimates the width of a redacted word in `ch` units.
 * Since content is stripped, we use a random-ish but deterministic
 * width based on the word ID to simulate variable word lengths.
 * Range: 3–12 characters wide.
 */
function estimateRedactedWidth(wordId: string): number {
  // Deterministic hash from UUID: sum char codes, mod range
  let hash = 0;
  for (let i = 0; i < wordId.length; i++) {
    hash = (hash + wordId.charCodeAt(i)) % 100;
  }
  return 3 + Math.floor((hash / 100) * 10); // 3–12 ch
}

export default function Word({
  word,
  interactionMode,
  isSelected,
  onWordClick,
}: WordProps) {
  // ── Redacted: solid black bar sized to approximate word length ──
  if (word.status === WordStatus.Redacted) {
    const isClickable = interactionMode === "uncover";
    const estimatedWidth = estimateRedactedWidth(word.id);
    return (
      <span
        className={`inline-block bg-black rounded-sm mx-0.5 align-middle ${
          isClickable ? "cursor-pointer hover:bg-neutral-700" : ""
        } ${isSelected ? "ring-2 ring-blue-500" : ""}`}
        style={{ width: `${estimatedWidth}ch`, height: "1.1em" }}
        onClick={() => isClickable && onWordClick(word.id)}
        role={isClickable ? "button" : undefined}
        aria-label={isClickable ? "Click to uncover this redacted word" : "Redacted word"}
      />
    );
  }

  // ── Admin removed: glitch placeholder ──
  if (word.status === WordStatus.AdminRemoved) {
    return (
      <span
        className="inline-block mx-0.5 align-middle bg-red-950/40 border border-red-900/30 rounded-sm overflow-hidden"
        style={{ width: "3.5em", height: "1.2em" }}
        aria-label="Content removed by site administrator"
      >
        <span className="block w-full h-full animate-pulse bg-gradient-to-r from-red-900/60 via-red-800/40 to-red-900/60" />
      </span>
    );
  }

  // ── Flagged: black overlay at 80% opacity (word still readable at 20%) ──
  if (word.status === WordStatus.Flagged && word.flag_count > 0) {
    const isClickable =
      interactionMode === "redact" || interactionMode === "flag";

    // Overlay opacity scales with flag count: 1 flag = light, 20 flags = 80%
    const overlayOpacity = Math.min(
      (word.flag_count / VALIDATION.MAX_FLAG_COUNT) * 0.8,
      0.8
    );

    return (
      <span
        className={`inline relative ${
          isClickable ? "cursor-pointer" : ""
        } ${isSelected ? "bg-blue-900/30 ring-1 ring-blue-500 rounded px-0.5" : ""}`}
        onClick={() => isClickable && onWordClick(word.id)}
        role={isClickable ? "button" : undefined}
      >
        {/* The word text, always visible underneath */}
        <span className="relative z-0">{word.content}</span>
        {/* Black overlay simulating flag/censorship -- still partially readable */}
        <span
          className="absolute inset-0 bg-black rounded-sm pointer-events-none"
          style={{ opacity: overlayOpacity }}
        />
      </span>
    );
  }

  // ── Visible: normal text ──
  const isClickable =
    interactionMode === "redact" || interactionMode === "flag";

  return (
    <span
      className={`inline ${
        isClickable ? "cursor-pointer hover:bg-amber-900/20 rounded px-0.5" : ""
      } ${isSelected ? "bg-blue-900/30 ring-1 ring-blue-500 rounded px-0.5" : ""}`}
      onClick={() => isClickable && onWordClick(word.id)}
      role={isClickable ? "button" : undefined}
    >
      {word.content}
    </span>
  );
}

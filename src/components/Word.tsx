/**
 * Word component — renders a single word based on its status.
 *
 * - visible: normal text
 * - flagged: opacity-degraded text (CSS opacity from flag_count)
 * - redacted: solid black bar (no content available)
 * - admin_removed: glitch GIF placeholder
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
 * Computes the CSS opacity for a flagged word.
 * Formula: opacity = (flag_count / 20) * 0.80
 */
function computeFlagOpacity(flagCount: number): number {
  return (flagCount / VALIDATION.MAX_FLAG_COUNT) * 0.8;
}

export default function Word({
  word,
  interactionMode,
  isSelected,
  onWordClick,
}: WordProps) {
  // ── Redacted: solid black bar ──
  if (word.status === WordStatus.Redacted) {
    const isClickable = interactionMode === "uncover";
    return (
      <span
        className={`inline-block bg-black rounded-sm mx-0.5 align-middle ${
          isClickable ? "cursor-pointer hover:bg-neutral-700" : ""
        } ${isSelected ? "ring-2 ring-blue-500" : ""}`}
        style={{ width: "3.5em", height: "1em" }}
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

  // ── Visible or Flagged: render the word text ──
  const flagOpacity =
    word.status === WordStatus.Flagged && word.flag_count > 0
      ? computeFlagOpacity(word.flag_count)
      : 0;

  const textOpacity = flagOpacity > 0 ? 1 - flagOpacity : 1;

  const isClickable =
    interactionMode === "redact" || interactionMode === "flag";

  return (
    <span
      className={`inline ${
        isClickable ? "cursor-pointer hover:bg-amber-900/20 rounded px-0.5" : ""
      } ${isSelected ? "bg-blue-900/30 ring-1 ring-blue-500 rounded px-0.5" : ""}`}
      style={{ opacity: textOpacity }}
      onClick={() => isClickable && onWordClick(word.id)}
      role={isClickable ? "button" : undefined}
    >
      {word.content}
    </span>
  );
}

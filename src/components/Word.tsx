/**
 * Word component — renders a single word based on its status.
 *
 * - visible: normal text
 * - flagged: black overlay at 80% opacity (word still 20% readable)
 * - redacted / admin_redacted: solid black bar sized to real word length
 * - admin_removed: glitchy animated ASCII sized to real word length
 *
 * Inputs: ApiWordResponse + interaction mode + click handler
 * Outputs: Rendered word span
 * Side Effects: setInterval for glitch animation (admin_removed only)
 */

"use client";

import { useState, useEffect, useRef, memo } from "react";
import { ApiWordResponse, WordStatus, VALIDATION } from "@/lib/types";

interface WordProps {
  readonly word: ApiWordResponse;
  readonly interactionMode: "redact" | "uncover" | "flag" | null;
  readonly isSelected: boolean;
  readonly onWordClick: (wordId: string) => void;
}

// ── Glitch character sets for nuclear-removed words ──
const GLITCH_BLOCKS = "█▓▒░▪■╳╬⊞⧫◼◾▣▩▤▥▦▧▨";
const GLITCH_FRAGMENTS = "¿¡§†‡¶∅∆∇◊∎⌀⌿⍉⍊⍋⍒⏃⏄⏅";
const ALL_GLITCH = GLITCH_BLOCKS + GLITCH_FRAGMENTS;

/** Generate a random glitch string of a given length. */
function randomGlitch(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALL_GLITCH[Math.floor(Math.random() * ALL_GLITCH.length)];
  }
  return result;
}

/**
 * GlitchText — rapidly cycles through random block characters.
 * Renders at the exact character width of the original word.
 */
function GlitchText({ length }: { length: number }) {
  const [text, setText] = useState(() => randomGlitch(length));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Fast flashing: randomize every 80ms for chaotic feel
    intervalRef.current = setInterval(() => {
      setText(randomGlitch(length));
    }, 80);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [length]);

  return (
    <span
      className="inline-block font-mono text-red-600/70 select-none glitch-shimmer"
      style={{ width: `${length}ch` }}
      aria-hidden="true"
    >
      {text}
    </span>
  );
}

const Word = memo(function Word({
  word,
  interactionMode,
  isSelected,
  onWordClick,
}: WordProps) {
  // ── Redacted / Admin Redacted: solid black bar sized to real word length ──
  if (
    word.status === WordStatus.Redacted ||
    word.status === WordStatus.AdminRedacted
  ) {
    // Only regular 'redacted' can be uncovered by users; admin_redacted is locked
    const isClickable =
      interactionMode === "uncover" && word.status === WordStatus.Redacted;
    const barWidth = Math.max(word.content_length, 1);

    return (
      <span
        className={`inline-block bg-black rounded-sm mx-0.5 align-middle ${
          isClickable ? "cursor-pointer hover:bg-neutral-700" : ""
        } ${isSelected ? "ring-2 ring-blue-500" : ""}${
          word.status === WordStatus.AdminRedacted
            ? " border border-red-900/30"
            : ""
        }`}
        style={{ width: `${barWidth}ch`, height: "1.1em" }}
        onClick={() => isClickable && onWordClick(word.id)}
        role={isClickable ? "button" : undefined}
        aria-label={
          isClickable
            ? "Click to uncover this redacted word"
            : word.status === WordStatus.AdminRedacted
            ? "Permanently redacted by administrator"
            : "Redacted word"
        }
      />
    );
  }

  // ── Admin removed: glitchy animated ASCII, sized to actual word length ──
  if (word.status === WordStatus.AdminRemoved) {
    const charLen = Math.max(word.content_length, 1);

    return (
      <span
        className="inline-block mx-0.5 align-middle overflow-hidden rounded-sm bg-neutral-950/80"
        style={{ height: "1.1em" }}
        aria-label="Content removed by site administrator"
      >
        <GlitchText length={charLen} />
      </span>
    );
  }

  // ── Flagged: black overlay at 80% opacity (word still readable at 20%) ──
  if (word.status === WordStatus.Flagged && word.flag_count > 0) {
    const isClickable =
      interactionMode === "redact" || interactionMode === "flag";

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
        <span className="relative z-0">{word.content}</span>
        <span
          className="absolute inset-0 bg-black rounded-sm pointer-events-none"
          style={{ opacity: overlayOpacity }}
        />
      </span>
    );
  }

  // ── Protected: looks normal but immune to user redact/flag ──
  if (word.status === WordStatus.Protected) {
    return <span className="inline">{word.content}</span>;
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
});

export default Word;

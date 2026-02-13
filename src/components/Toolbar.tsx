/**
 * Toolbar component — bottom floating action bar.
 * 
 * Write button expands into an inline input field on click.
 * Multi-word support: spaces → parsed into separate word actions (max 100 words).
 * Redact (pen), Uncover (eye), Flag (flag) are compact icon buttons.
 * Cart icon removed (moved to header).
 *
 * Inputs: Active mode, mode change handler, onWriteSubmit
 * Outputs: Rendered floating toolbar
 * Side Effects: None (state managed by parent)
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type ToolMode = "write" | "redact" | "uncover" | "flag" | null;

const MAX_WORDS_PER_SUBMIT = 100;

/**
 * Character allowlist — matches server-side validation.ts exactly.
 * Allows: a-z A-Z and approved punctuation. Spaces allowed for multi-word input.
 * Prevents: 0-9, @, #, ^, (, ), [, ], {, } and other disallowed chars.
 */
const ALLOWED_CHAR_PATTERN = /^[a-zA-Z`~!$%&*_\-+=:;"'<,>.?/|\\ ]*$/;

interface ToolbarProps {
  readonly activeMode: ToolMode;
  readonly onModeChange: (mode: ToolMode) => void;
  readonly onWriteSubmit: (words: string[]) => void;
  readonly showWriteTooltip: boolean;
  readonly onDismissTooltip: () => void;
}

export default function Toolbar({
  activeMode,
  onModeChange,
  onWriteSubmit,
  showWriteTooltip,
  onDismissTooltip,
}: ToolbarProps) {
  const [writeInput, setWriteInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isWriteMode = activeMode === "write";

  // Auto-focus the input when write mode activates
  useEffect(() => {
    if (isWriteMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isWriteMode]);

  /** Filters input to only allow valid characters. */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (ALLOWED_CHAR_PATTERN.test(value)) {
      setWriteInput(value);
    }
    // Silently ignore disallowed characters
  }, []);


  /** Parse input, splitting on spaces into individual words. */
  const handleWriteSubmit = useCallback(() => {
    const words = writeInput
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);

    if (words.length === 0) return;

    if (words.length > MAX_WORDS_PER_SUBMIT) {
      // Gentle alert: too many words
      onWriteSubmit([]); // signal error to parent
      return;
    }

    // Validate each word length (max 20 chars)
    for (const word of words) {
      if (word.length > 20) {
        onWriteSubmit([]); // signal error
        return;
      }
    }

    onWriteSubmit(words);
    setWriteInput("");
  }, [writeInput, onWriteSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleWriteSubmit();
    }
    if (e.key === "Escape") {
      onModeChange(null);
    }
  };

  const toggleMode = (mode: ToolMode) => {
    onModeChange(activeMode === mode ? null : mode);
    if (mode === "write") {
      onDismissTooltip();
    }
  };

  /** Calculate price for current input. */
  const wordCount = writeInput.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const price = wordCount * 1;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
      {/* Mode hint */}
      {activeMode && activeMode !== "write" && (
        <div className="px-3 py-1 bg-neutral-900/90 rounded text-neutral-400 text-xs border border-neutral-800">
          {activeMode === "redact" && "Click a word to redact it ($2)"}
          {activeMode === "uncover" && "Click a redacted word to uncover it ($2)"}
          {activeMode === "flag" && "Click a word to flag it (free)"}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1 px-3 py-2 bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl">
        {/* Write — expands into input when active */}
        <div className="relative">
          {/* Tooltip — guides new users */}
          {showWriteTooltip && !isWriteMode && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 animate-tooltip-bounce">
              <div className="relative px-3 py-1.5 bg-amber-900/90 border border-amber-700 rounded-lg text-amber-200 text-xs whitespace-nowrap shadow-lg">
                Start here — add your word!
                <button
                  onClick={onDismissTooltip}
                  className="ml-2 text-amber-500 hover:text-amber-200"
                >
                  ✕
                </button>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-900/90 border-r border-b border-amber-700 rotate-45 -mt-1" />
              </div>
            </div>
          )}

          {isWriteMode ? (
            /* Expanded state — input field with submit */
            <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-amber-900/30 border border-amber-800/40">
              <span className="text-amber-400 text-sm font-medium">Aa</span>
              <input
                ref={inputRef}
                type="text"
                value={writeInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a word or sentence..."
                className="bg-transparent text-white text-sm outline-none w-48 sm:w-64 placeholder:text-neutral-500"
              />
              {wordCount > 0 && (
                <span className="text-neutral-500 text-xs font-mono shrink-0">
                  {wordCount > 1 ? `${wordCount} words` : "1 word"}
                </span>
              )}
              <button
                onClick={handleWriteSubmit}
                disabled={wordCount === 0}
                className="px-3 py-1 bg-amber-700 hover:bg-amber-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-white text-xs rounded transition-colors whitespace-nowrap"
              >
                {wordCount > 1 ? `Add $${price}` : "Add $1"}
              </button>
            </div>
          ) : (
            /* Collapsed state — button */
            <button
              id="toolbar-write"
              onClick={() => toggleMode("write")}
              className="flex items-center justify-center gap-2 px-5 h-10 rounded-lg transition-colors text-sm font-medium bg-amber-900/30 text-amber-400 hover:bg-amber-800/40 hover:text-amber-300 border border-amber-800/40"
              title="Write a word ($1)"
            >
              <span className="text-base">Aa</span>
              <span className="hidden sm:inline">Submit a word</span>
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-neutral-700 mx-1" />

        {/* Redact */}
        <button
          id="toolbar-redact"
          onClick={() => toggleMode("redact")}
          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
            activeMode === "redact"
              ? "bg-amber-700 text-white"
              : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
          }`}
          title="Redact a word ($2)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
        </button>

        {/* Uncover */}
        <button
          id="toolbar-uncover"
          onClick={() => toggleMode("uncover")}
          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
            activeMode === "uncover"
              ? "bg-amber-700 text-white"
              : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
          }`}
          title="Uncover a redacted word ($2)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>

        {/* Flag */}
        <button
          id="toolbar-flag"
          onClick={() => toggleMode("flag")}
          className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
            activeMode === "flag"
              ? "bg-amber-700 text-white"
              : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
          }`}
          title="Flag a word (free)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
            <line x1="4" y1="22" x2="4" y2="15"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

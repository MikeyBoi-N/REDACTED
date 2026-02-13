/**
 * Toolbar component — bottom floating action bar.
 * Write button is wide and highlighted for discoverability.
 * Redact (pen), Uncover (eye), Flag (flag) are compact icon buttons.
 *
 * Inputs: Active mode, mode change handler, onWriteSubmit
 * Outputs: Rendered floating toolbar
 * Side Effects: None (state managed by parent)
 */

"use client";

import { useState } from "react";

type ToolMode = "write" | "redact" | "uncover" | "flag" | null;

interface ToolbarProps {
  readonly activeMode: ToolMode;
  readonly onModeChange: (mode: ToolMode) => void;
  readonly onWriteSubmit: (word: string) => void;
  readonly cartItemCount: number;
  readonly onCartOpen: () => void;
}

export default function Toolbar({
  activeMode,
  onModeChange,
  onWriteSubmit,
  cartItemCount,
  onCartOpen,
}: ToolbarProps) {
  const [writeInput, setWriteInput] = useState("");

  const handleWriteSubmit = () => {
    const trimmed = writeInput.trim();
    if (trimmed) {
      onWriteSubmit(trimmed);
      setWriteInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleWriteSubmit();
    }
  };

  const toggleMode = (mode: ToolMode) => {
    onModeChange(activeMode === mode ? null : mode);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
      {/* Write input — appears when write mode is active */}
      {activeMode === "write" && (
        <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900 rounded-lg border border-neutral-700 shadow-xl">
          <input
            type="text"
            value={writeInput}
            onChange={(e) => setWriteInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a word..."
            maxLength={20}
            className="bg-transparent text-white text-sm outline-none w-48 placeholder:text-neutral-500"
            autoFocus
          />
          <span className="text-neutral-600 text-xs font-mono">
            {writeInput.length}/20
          </span>
          <button
            onClick={handleWriteSubmit}
            disabled={!writeInput.trim()}
            className="px-3 py-1 bg-amber-700 hover:bg-amber-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-white text-xs rounded transition-colors"
          >
            Add $1
          </button>
        </div>
      )}

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
        {/* Write — wide prominent button */}
        <button
          id="toolbar-write"
          onClick={() => toggleMode("write")}
          className={`flex items-center justify-center gap-2 px-5 h-10 rounded-lg transition-colors text-sm font-medium ${
            activeMode === "write"
              ? "bg-amber-700 text-white"
              : "bg-amber-900/30 text-amber-400 hover:bg-amber-800/40 hover:text-amber-300 border border-amber-800/40"
          }`}
          title="Write a word ($1)"
        >
          <span className="hidden sm:inline">Submit a word</span>
        </button>

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

        {/* Divider */}
        <div className="w-px h-6 bg-neutral-700 mx-1" />

        {/* Cart */}
        <button
          id="toolbar-cart"
          onClick={onCartOpen}
          className="relative flex items-center justify-center w-10 h-10 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          title="View cart"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          {cartItemCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartItemCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

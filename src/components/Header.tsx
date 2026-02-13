/**
 * Header component — top bar with interactive [ REDACTED ] logo.
 *
 * - Click logo: cycles through cryptic project descriptions (positioned like sidebar)
 * - Easter egg: in "uncover" mode, clicking the logo shows morse code for "REVEALED"
 * - Balance removed per user request (total shown in cart panel)
 *
 * Inputs: activeMode (for easter egg detection)
 * Outputs: Rendered header bar + optional sidebar-positioned popup
 * Side Effects: Local popup state
 */

"use client";

import { useState, useCallback } from "react";

/** Cryptic, slightly poetic descriptions that cycle on each click. */
const CRYPTIC_MESSAGES = [
  "Every word costs something. Every silence costs more.",
  "You are not reading a story. You are watching a species try to speak.",
  "The first word was free. Nothing since has been.",
  "Somewhere between graffiti and gospel, this is what we chose to say.",
  "This page is a mirror. Don't blame the glass.",
  "One dollar. One word. One chance to be permanent... or redacted.",
  "The story doesn't care about your intentions. Only your dollar.",
] as const;

/** Morse code for "REVEALED" — the easter egg reveal. */
const MORSE_REDACTED = ".-. . ...- . .- .-.. . -..";

interface HeaderProps {
  readonly activeMode: string | null;
}

export default function Header({ activeMode }: HeaderProps) {
  const [popupIndex, setPopupIndex] = useState<number | null>(null);
  const [cycleCounter, setCycleCounter] = useState(0);
  const [showMorse, setShowMorse] = useState(false);

  const handleHeaderClick = useCallback(() => {
    // Easter egg: in uncover mode, swap header text to morse code
    if (activeMode === "uncover") {
      setShowMorse((prev) => !prev);
      setPopupIndex(null);
      return;
    }

    // Normal: toggle popup or cycle to next message
    if (popupIndex !== null) {
      setPopupIndex(null);
    } else {
      setPopupIndex(cycleCounter % CRYPTIC_MESSAGES.length);
      setCycleCounter((prev) => prev + 1);
    }
  }, [activeMode, popupIndex, cycleCounter]);

  const dismissPopup = useCallback(() => {
    setPopupIndex(null);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-neutral-950 border-b border-neutral-800">
        <h1
          className="text-xl font-bold tracking-tight text-white font-mono cursor-pointer hover:text-amber-400 transition-colors select-none"
          onClick={handleHeaderClick}
        >
          {showMorse ? MORSE_REDACTED : "[ REDACTED ]"}
        </h1>

        {/* Right side intentionally empty — balance removed, total is in cart */}
        <div />
      </header>

      {/* Cycling popup — positioned like sidebar boxes (fixed, left side) */}
      {popupIndex !== null && (
        <div className="fixed left-4 top-20 z-40 w-56 pointer-events-auto animate-slide-in">
          <div className="relative p-3 bg-neutral-900/95 backdrop-blur rounded border border-amber-900/40 shadow-2xl text-neutral-400 text-xs leading-relaxed">
            <button
              onClick={dismissPopup}
              className="absolute top-1.5 right-1.5 text-neutral-600 hover:text-neutral-300 text-xs"
              aria-label="Dismiss"
            >
              ✕
            </button>
            <p className="pr-4 italic">{CRYPTIC_MESSAGES[popupIndex]}</p>
          </div>
        </div>
      )}
    </>
  );
}

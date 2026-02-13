/**
 * Header component — top bar with interactive [ REDACTED ] logo and cart.
 *
 * - Click logo: cycles through cryptic project descriptions (positioned like sidebar)
 * - Easter egg: in "uncover" mode, clicking the logo shows morse code for "REVEALED"
 * - Subtitle displayed next to logo
 * - Cart icon in top-right corner
 *
 * Inputs: activeMode, cartItemCount, onCartOpen
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
  "One dollar. One word. One chance to be permanent — or redacted.",
  "The story doesn't care about your intentions. Only your dollar.",
] as const;

/** Morse code for "REVEALED" — the easter egg reveal. */
const MORSE_REDACTED = ".-. . ...- . .- .-.. . -..";

interface HeaderProps {
  readonly activeMode: string | null;
  readonly cartItemCount: number;
  readonly onCartOpen: () => void;
}

export default function Header({ activeMode, cartItemCount, onCartOpen }: HeaderProps) {
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
        {/* Logo + subtitle */}
        <div className="flex items-baseline gap-3">
          <h1
            className="text-xl font-bold tracking-tight text-white font-mono cursor-pointer hover:text-amber-400 transition-colors select-none"
            onClick={handleHeaderClick}
          >
            {showMorse ? MORSE_REDACTED : "[ REDACTED ]"}
          </h1>
          <span className="text-[11px] text-neutral-500 hidden sm:inline tracking-wide">
            An Unsanctioned Novel Written by the Internet
          </span>
        </div>

        {/* Cart icon — top right */}
        <button
          onClick={onCartOpen}
          className="relative flex items-center justify-center w-9 h-9 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
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

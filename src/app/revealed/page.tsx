/**
 * /revealed — hidden signal words page.
 *
 * Discovered via the morse code easter egg in the header.
 * Fetches signal words from /api/signals (database-backed).
 * Displays a 3x3 grid: countdown timers or revealed words.
 * Header click navigates home — no other navigation needed.
 *
 * Inputs: None (fetches from API)
 * Outputs: Rendered signal words page
 * Side Effects: API fetch, setInterval for countdown ticking
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";

interface SignalData {
  readonly id: string;
  readonly word: string | null;
  readonly charCount: number;
  readonly revealDate: string;
  readonly group: number;
  readonly revealed: boolean;
}

/** Format a millisecond delta as "Xd HH:MM:SS" on a single line. */
function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  if (days > 0) {
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Single signal word cell — countdown or revealed. */
function SignalWordCell({ signal, now }: { signal: SignalData; now: Date }) {
  const revealTime = new Date(signal.revealDate).getTime();
  const remaining = revealTime - now.getTime();
  const isRevealed = remaining <= 0;

  if (isRevealed && signal.word) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-white text-lg md:text-xl font-mono font-bold tracking-wide">
          {signal.word}
        </span>
      </div>
    );
  }

  // Redacted: red countdown overlaid on black bar
  return (
    <div className="flex items-center justify-center">
      <div
        className="relative inline-flex items-center justify-center bg-black rounded-sm px-3"
        style={{ minWidth: "10ch", height: "2em" }}
      >
        <span className="text-red-500 text-sm font-mono font-bold select-none whitespace-nowrap">
          {formatCountdown(remaining)}
        </span>
      </div>
    </div>
  );
}

export default function RevealedPage() {
  const [now, setNow] = useState(new Date());
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch signal words from API
  useEffect(() => {
    fetch("/api/signals")
      .then((res) => res.json())
      .then((data) => {
        setSignals(data.signals ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Tick every second for live countdowns
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCartOpen = useCallback(() => {}, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-serif">
      <Header
        activeMode="uncover"
        cartItemCount={0}
        onCartOpen={handleCartOpen}
      />

      <main className="max-w-4xl mx-auto pt-24 pb-12 px-6">
        {/* Page heading */}
        <div className="mb-16 text-center">
          <p className="text-neutral-600 font-mono text-xs tracking-widest uppercase mb-4">
            Signal Intercept
          </p>
          <h1 className="text-3xl md:text-5xl font-mono font-bold tracking-tight text-neutral-200 mb-2">
            [ &nbsp;REVEALED&nbsp; ]
          </h1>
          <p className="text-neutral-500 text-sm italic max-w-md mx-auto">
            Patience is a virtue. 
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-pulse text-neutral-600 font-mono">
              [ INTERCEPTING SIGNAL... ]
            </div>
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center text-neutral-600 font-mono py-20">
            [ NO SIGNALS DETECTED ]
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-y-24 gap-x-8 md:gap-x-16 py-12">
            {signals.map((signal) => (
              <SignalWordCell key={signal.id} signal={signal} now={now} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

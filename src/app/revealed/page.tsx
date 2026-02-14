/**
 * /revealed — hidden signal words page.
 *
 * Discovered via the morse code easter egg in the header.
 * Fetches signal words from /api/signals (database-backed).
 * Unrevealed words show as black bars with red countdown timers.
 * Revealed words show their content.
 *
 * Inputs: None (fetches from API)
 * Outputs: Rendered signal words page
 * Side Effects: API fetch, setInterval for countdown ticking
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

interface SignalData {
  readonly id: string;
  readonly word: string | null;
  readonly charCount: number;
  readonly revealDate: string;
  readonly group: number;
  readonly revealed: boolean;
}

/** Format a millisecond delta as Xd HH:MM:SS. */
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

/** Single signal word row — countdown or revealed. */
function SignalWordRow({ signal, now }: { signal: SignalData; now: Date }) {
  const revealTime = new Date(signal.revealDate).getTime();
  const remaining = revealTime - now.getTime();
  const isRevealed = remaining <= 0;

  if (isRevealed && signal.word) {
    return (
      <div className="flex items-center gap-4 py-3">
        <span className="text-white text-xl md:text-2xl font-mono font-bold tracking-wide">
          {signal.word}
        </span>
        <span className="text-emerald-600 text-xs font-mono">REVEALED</span>
      </div>
    );
  }

  // Redacted: black bar with red countdown
  const barWidth = Math.max(signal.charCount, 4);

  return (
    <div className="flex items-center gap-4 py-3">
      <div
        className="relative inline-flex items-center justify-center bg-black rounded-sm"
        style={{ width: `${barWidth}ch`, height: "1.8em" }}
      >
        <span className="text-red-500 text-xs font-mono select-none z-10">
          {formatCountdown(remaining)}
        </span>
      </div>
    </div>
  );
}

export default function RevealedPage() {
  const router = useRouter();
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

  const handleCartOpen = useCallback(() => {
    // No cart on this page
  }, []);

  // Group signal words by group number
  const groups = [1, 2, 3].map((g) =>
    signals.filter((sw) => sw.group === g)
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-serif">
      <Header
        activeMode="uncover"
        cartItemCount={0}
        onCartOpen={handleCartOpen}
      />

      <main className="max-w-2xl mx-auto pt-24 pb-32 px-6">
        {/* Page heading */}
        <div className="mb-12 text-center">
          <p className="text-neutral-600 font-mono text-xs tracking-widest uppercase mb-4">
            Signal Intercept
          </p>
          <h1 className="text-3xl md:text-4xl font-mono font-bold tracking-tight text-neutral-200 mb-2">
            [ REVEALED ]
          </h1>
          <p className="text-neutral-500 text-sm italic max-w-md mx-auto">
            Nine words. Three phases. Time is the only key.
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
          <div className="space-y-10">
            {groups.map((group, gi) =>
              group.length > 0 ? (
                <div key={gi}>
                  <div className="text-neutral-700 font-mono text-[10px] uppercase tracking-[0.3em] mb-3">
                    Phase {gi + 1}
                  </div>
                  <div className="border-l-2 border-neutral-800 pl-6 space-y-1">
                    {group.map((signal) => (
                      <SignalWordRow key={signal.id} signal={signal} now={now} />
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}

        {/* Return link */}
        <div className="mt-16 text-center">
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 font-mono text-sm rounded border border-neutral-800 transition-colors"
          >
            ← RETURN
          </button>
        </div>
      </main>

      {/* Minimal toolbar — uncover only, thematic */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 px-3 py-2 bg-neutral-900/95 backdrop-blur rounded-full border border-neutral-700 shadow-2xl">
          <button
            className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800/50"
            title="Uncover mode active"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

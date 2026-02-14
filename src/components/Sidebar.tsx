/**
 * Sidebar component — closable philosophy blurbs and pricing info.
 * Positioned as an absolute overlay so it never shifts the paper.
 * Each box has an X button to dismiss it.
 * Dismissals persist in sessionStorage (survives refresh, clears on browser close).
 *
 * Inputs: None
 * Outputs: Rendered sidebar overlay
 * Side Effects: Reads/writes sessionStorage for dismissed state
 */

"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "redacted_sidebar_dismissed";

/** Load dismissed set from sessionStorage. */
function loadDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch {
    // Ignore parse errors
  }
  return new Set();
}

/** Save dismissed set to sessionStorage. */
function saveDismissed(dismissed: Set<string>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]));
  } catch {
    // Ignore storage errors
  }
}

interface SidebarBoxProps {
  readonly id: string;
  readonly children: React.ReactNode;
  readonly dismissed: Set<string>;
  readonly onDismiss: (id: string) => void;
}

function SidebarBox({ id, children, dismissed, onDismiss }: SidebarBoxProps) {
  if (dismissed.has(id)) return null;

  return (
    <div className="relative p-3 bg-neutral-900/90 backdrop-blur rounded border border-neutral-800/50 group">
      <button
        onClick={() => onDismiss(id)}
        className="absolute top-1.5 right-1.5 text-neutral-600 hover:text-neutral-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        ✕
      </button>
      {children}
    </div>
  );
}

export default function Sidebar() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev).add(id);
      saveDismissed(next);
      return next;
    });
  }, []);

  // If all boxes are dismissed, hide entirely
  const allDismissed = dismissed.size >= 4;
  if (allDismissed) return null;

  return (
    <aside className="hidden lg:flex flex-col gap-4 w-56 shrink-0 fixed left-4 top-20 z-30 text-neutral-400 text-xs leading-relaxed pointer-events-none">
      <div className="flex flex-col gap-4 pointer-events-auto">
        <SidebarBox id="philosophy-1" dismissed={dismissed} onDismiss={handleDismiss}>
          <p>
            Freedom, censorship, knowledge, mystery, hate, love. This is a
            philosophical project.
          </p>
          <p className="mt-1">A study.</p>
          <p>An art piece.</p>
          <p>A mirror.</p>
        </SidebarBox>

        <SidebarBox id="philosophy-2" dismissed={dismissed} onDismiss={handleDismiss}>
          <p>
            It&apos;s absurd, stupid, a waste, but it&apos;s insightful to who we are as
            humans.
          </p>
        </SidebarBox>

        <SidebarBox id="philosophy-3" dismissed={dismissed} onDismiss={handleDismiss}>
          <p>
            This isn&apos;t AI; humans write the next word. It&apos;s not a damn algorithm.
            It&apos;s YOU. What will you write?
          </p>
        </SidebarBox>

        <SidebarBox id="pricing" dismissed={dismissed} onDismiss={handleDismiss}>
          <p className="font-medium text-neutral-300 mb-2">Pricing</p>
          <ul className="space-y-1.5">
            <li>$1 to write a word (20 letters max)</li>
            <li>$2 to [ REDACT ] a word</li>
            <li>$2 to uncover a [ REDACTED ] word</li>
            <li className="text-neutral-500">
              Free to flag a word you don&apos;t like. Enough flags reduce its
              visibility
            </li>
            <li className="pt-2">
              <a href="/stats" className="text-amber-500 hover:text-amber-400 transition-colors font-mono uppercase text-[10px] tracking-wider">
                [ VIEW STATS ]
              </a>
            </li>
          </ul>
        </SidebarBox>
      </div>
    </aside>
  );
}

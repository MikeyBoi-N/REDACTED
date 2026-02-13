/**
 * Admin Panel — hidden moderation UI for content management.
 *
 * Accessed via URL: /admin
 * Authenticates with secret token via the admin API (sent as x-admin-token header).
 * Shows all words with ability to write (free), flag, redact, uncover, and nuclear remove.
 *
 * Inputs: None
 * Outputs: Full admin moderation interface
 * Side Effects: API calls to /api/admin, /api/words, /api/flag
 */

"use client";

import { useState, useEffect, useCallback } from "react";

interface AdminWord {
  readonly id: string;
  readonly position: number;
  readonly content: string | null;
  readonly status: string;
  readonly flag_count: number;
  readonly created_at: string;
}

/** Must match AdminActionType enum from lib/types.ts */
type AdminAction = "write" | "redact" | "uncover" | "nuclear_remove";

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [words, setWords] = useState<AdminWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLog, setActionLog] = useState<string[]>([]);

  // Write tool state
  const [writeInput, setWriteInput] = useState("");
  const [writing, setWriting] = useState(false);

  const fetchWords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/words");
      if (!res.ok) throw new Error("Failed to fetch words");
      const data = await res.json();
      setWords(data.words ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchWords();
    }
  }, [authenticated, fetchWords]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      setAuthenticated(true);
    }
  };

  const logAction = useCallback((message: string) => {
    setActionLog((prev) => [message, ...prev]);
  }, []);

  /** Send admin action — token goes in the x-admin-token header. */
  const performAction = useCallback(
    async (action: AdminAction, wordId?: string, wordContent?: string) => {
      try {
        const body: Record<string, string> = { action };
        if (wordId) body.wordId = wordId;
        if (wordContent) body.wordContent = wordContent;

        const res = await fetch("/api/admin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": token,
          },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        const label = wordId ? `#${wordId.slice(0, 8)}…` : wordContent ?? "";

        if (!res.ok) {
          logAction(`❌ ${action} ${label} — ${data.error ?? res.status}`);
          return;
        }

        logAction(`✅ ${action} ${label} — success`);
        fetchWords();
      } catch {
        logAction(`❌ ${action} failed — network error`);
      }
    },
    [token, fetchWords, logAction]
  );

  /** Admin write — free, bypasses payment. */
  const handleAdminWrite = useCallback(async () => {
    const word = writeInput.trim();
    if (!word) return;

    setWriting(true);
    await performAction("write", undefined, word);
    setWriteInput("");
    setWriting(false);
  }, [writeInput, performAction]);

  /** Admin flag — direct flag (no fingerprint/duplicate check). */
  const handleAdminFlag = useCallback(
    async (wordId: string) => {
      try {
        const res = await fetch("/api/flag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wordId, visitorId: `admin-${token.slice(0, 8)}` }),
        });

        const data = await res.json();

        if (!res.ok) {
          logAction(`❌ flag #${wordId.slice(0, 8)}… — ${data.error ?? res.status}`);
        } else {
          logAction(`✅ flag #${wordId.slice(0, 8)}… — flagged`);
          fetchWords();
        }
      } catch {
        logAction(`❌ flag failed — network error`);
      }
    },
    [token, fetchWords, logAction]
  );

  // ── Login screen ──
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm p-6 bg-neutral-900 rounded-lg border border-neutral-800"
        >
          <h1 className="text-white font-mono text-lg mb-4">
            [ ADMIN ACCESS ]
          </h1>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter admin token"
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm outline-none focus:border-amber-600 mb-3"
            autoFocus
          />
          <button
            type="submit"
            className="w-full py-2 bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium rounded transition-colors"
          >
            Authenticate
          </button>
        </form>
      </div>
    );
  }

  // ── Admin dashboard ──
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-mono font-bold">[ ADMIN PANEL ]</h1>
          <div className="flex items-center gap-3">
            <span className="text-neutral-500 text-xs font-mono">
              {words.length} words
            </span>
            <button
              onClick={fetchWords}
              className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-xs transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-950 border border-red-800 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Admin write tool — unbound, free */}
        <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-neutral-900 rounded-lg border border-amber-900/40">
          <span className="text-amber-500 text-sm font-medium shrink-0">Write:</span>
          <input
            type="text"
            value={writeInput}
            onChange={(e) => setWriteInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdminWrite()}
            placeholder="Type a word to add..."
            maxLength={20}
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-neutral-500"
          />
          <span className="text-neutral-600 text-xs font-mono shrink-0">
            {writeInput.length}/20
          </span>
          <button
            onClick={handleAdminWrite}
            disabled={!writeInput.trim() || writing}
            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-white text-xs font-medium rounded transition-colors"
          >
            {writing ? "…" : "Publish (free)"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Word list */}
          <div className="lg:col-span-2 space-y-1">
            {loading ? (
              <p className="text-neutral-500 animate-pulse">Loading words...</p>
            ) : words.length === 0 ? (
              <p className="text-neutral-500">No words in the story yet.</p>
            ) : (
              words.map((word) => (
                <div
                  key={word.id}
                  className="flex items-center gap-3 px-3 py-2 bg-neutral-900 rounded border border-neutral-800 hover:border-neutral-700 transition-colors"
                >
                  {/* Position */}
                  <span className="text-neutral-600 text-xs font-mono w-8 shrink-0">
                    #{word.position}
                  </span>

                  {/* Content */}
                  <span
                    className={`flex-1 text-sm font-serif ${
                      word.status === "redacted"
                        ? "text-neutral-600 line-through"
                        : word.status === "admin_removed"
                        ? "text-red-500 line-through"
                        : word.status === "flagged"
                        ? "text-amber-400"
                        : "text-white"
                    }`}
                  >
                    {word.content ?? "[hidden]"}
                  </span>

                  {/* Status badge */}
                  <span
                    className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                      word.status === "visible"
                        ? "bg-green-950 text-green-400"
                        : word.status === "flagged"
                        ? "bg-amber-950 text-amber-400"
                        : word.status === "redacted"
                        ? "bg-neutral-800 text-neutral-400"
                        : "bg-red-950 text-red-400"
                    }`}
                  >
                    {word.status}
                  </span>

                  {/* Flag count */}
                  {word.flag_count > 0 && (
                    <span className="text-xs text-amber-500 shrink-0">
                      🚩{word.flag_count}
                    </span>
                  )}

                  {/* Action buttons — all tools, unbound */}
                  <div className="flex gap-1 shrink-0">
                    {/* Flag */}
                    {(word.status === "visible" || word.status === "flagged") && (
                      <button
                        onClick={() => handleAdminFlag(word.id)}
                        className="px-2 py-0.5 bg-neutral-800 hover:bg-amber-900 text-neutral-400 hover:text-amber-300 text-xs rounded transition-colors"
                        title="Flag"
                      >
                        🚩
                      </button>
                    )}
                    {/* Redact */}
                    {word.status !== "redacted" && word.status !== "admin_removed" && (
                      <button
                        onClick={() => performAction("redact", word.id)}
                        className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white text-xs rounded transition-colors"
                        title="Redact"
                      >
                        ██
                      </button>
                    )}
                    {/* Uncover */}
                    {word.status === "redacted" && (
                      <button
                        onClick={() => performAction("uncover", word.id)}
                        className="px-2 py-0.5 bg-neutral-800 hover:bg-blue-900 text-neutral-400 hover:text-blue-300 text-xs rounded transition-colors"
                        title="Uncover"
                      >
                        👁
                      </button>
                    )}
                    {/* Nuclear remove */}
                    {word.status !== "admin_removed" && (
                      <button
                        onClick={() => performAction("nuclear_remove", word.id)}
                        className="px-2 py-0.5 bg-neutral-800 hover:bg-red-900 text-neutral-400 hover:text-red-300 text-xs rounded transition-colors"
                        title="Nuclear remove"
                      >
                        ☢
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Action log */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-neutral-400">Action Log</h2>
            <div className="bg-neutral-900 rounded border border-neutral-800 p-3 max-h-96 overflow-y-auto">
              {actionLog.length === 0 ? (
                <p className="text-neutral-600 text-xs">No actions yet.</p>
              ) : (
                actionLog.map((entry, i) => (
                  <p key={i} className="text-xs text-neutral-400 py-0.5 font-mono">
                    {entry}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

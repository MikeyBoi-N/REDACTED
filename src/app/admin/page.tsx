/**
 * Admin Panel — hidden moderation UI for content management.
 *
 * Accessed via URL: /admin
 * Authenticates with secret token via the admin API (sent as x-admin-token header).
 * All tools are unbound: write (free, no char restrictions), flag/unflag (no dupe check),
 * redact (user-undoable), admin redact (permanent), uncover, nuclear remove (with confirm),
 * restore (reverse nuclear remove).
 *
 * Inputs: None
 * Outputs: Full admin moderation interface
 * Side Effects: API calls to /api/admin, /api/words
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
type AdminAction =
  | "write"
  | "redact"
  | "admin_redact"
  | "uncover"
  | "nuclear_remove"
  | "restore"
  | "flag"
  | "unflag";

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

  /** Nuclear remove with confirmation prompt. */
  const handleNuclearRemove = useCallback(
    (wordId: string, wordContent: string | null) => {
      const display = wordContent ?? "[hidden]";
      const confirmed = window.confirm(
        `Are you sure you want to NUCLEAR REMOVE "${display}"?\n\nThis will replace the word with glitch art. You can restore it later.`
      );
      if (confirmed) {
        performAction("nuclear_remove", wordId);
      }
    },
    [performAction]
  );

  /** Admin write — free, no character restrictions. */
  const handleAdminWrite = useCallback(async () => {
    const word = writeInput.trim();
    if (!word) return;

    setWriting(true);
    await performAction("write", undefined, word);
    setWriteInput("");
    setWriting(false);
  }, [writeInput, performAction]);

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

        {/* Legend */}
        <div className="mb-4 flex flex-wrap gap-3 text-[10px] text-neutral-500">
          <span>██ = Redact (users can pay to uncover)</span>
          <span>🔒 = Admin Lock (permanent, only admin can undo)</span>
          <span>☢ = Nuclear Remove (glitch art, admin can restore)</span>
        </div>

        {/* Admin write tool — unbound, free, no char restrictions */}
        <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-neutral-900 rounded-lg border border-amber-900/40">
          <span className="text-amber-500 text-sm font-medium shrink-0">Write:</span>
          <input
            type="text"
            value={writeInput}
            onChange={(e) => setWriteInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdminWrite()}
            placeholder="Type anything — no restrictions..."
            maxLength={100}
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-neutral-500"
          />
          <span className="text-neutral-600 text-xs font-mono shrink-0">
            {writeInput.length}/100
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
                      word.status === "redacted" || word.status === "admin_redacted"
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
                        : word.status === "admin_redacted"
                        ? "bg-purple-950 text-purple-400"
                        : "bg-red-950 text-red-400"
                    }`}
                  >
                    {word.status === "admin_redacted" ? "🔒 locked" : word.status}
                  </span>

                  {/* Flag count */}
                  {word.flag_count > 0 && (
                    <span className="text-xs text-amber-500 shrink-0">
                      🚩{word.flag_count}
                    </span>
                  )}

                  {/* Action buttons — all tools, fully unbound */}
                  <div className="flex gap-1 shrink-0">
                    {/* Flag + / Unflag - */}
                    {word.status !== "admin_removed" && word.status !== "admin_redacted" && (
                      <>
                        <button
                          onClick={() => performAction("flag", word.id)}
                          className="px-2 py-0.5 bg-neutral-800 hover:bg-amber-900 text-neutral-400 hover:text-amber-300 text-xs rounded transition-colors"
                          title="Add flag"
                        >
                          🚩+
                        </button>
                        {word.flag_count > 0 && (
                          <button
                            onClick={() => performAction("unflag", word.id)}
                            className="px-2 py-0.5 bg-neutral-800 hover:bg-green-900 text-neutral-400 hover:text-green-300 text-xs rounded transition-colors"
                            title="Remove flag"
                          >
                            🚩−
                          </button>
                        )}
                      </>
                    )}

                    {/* Redact (user-undoable) */}
                    {(word.status === "visible" || word.status === "flagged") && (
                      <button
                        onClick={() => performAction("redact", word.id)}
                        className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white text-xs rounded transition-colors"
                        title="Redact (users can pay to uncover)"
                      >
                        ██
                      </button>
                    )}

                    {/* Admin Lock (permanent redaction, only admin can undo) */}
                    {(word.status === "visible" || word.status === "flagged" || word.status === "redacted") && (
                      <button
                        onClick={() => performAction("admin_redact", word.id)}
                        className="px-2 py-0.5 bg-neutral-800 hover:bg-purple-900 text-neutral-400 hover:text-purple-300 text-xs rounded transition-colors"
                        title="Admin Lock — permanent redact, only admin can undo"
                      >
                        🔒
                      </button>
                    )}

                    {/* Uncover (works on both redacted and admin_redacted for admin) */}
                    {(word.status === "redacted" || word.status === "admin_redacted") && (
                      <button
                        onClick={() => performAction("uncover", word.id)}
                        className="px-2 py-0.5 bg-neutral-800 hover:bg-blue-900 text-neutral-400 hover:text-blue-300 text-xs rounded transition-colors"
                        title="Uncover"
                      >
                        👁
                      </button>
                    )}

                    {/* Nuclear remove — with confirmation */}
                    {word.status !== "admin_removed" && (
                      <button
                        onClick={() => handleNuclearRemove(word.id, word.content)}
                        className="px-2 py-0.5 bg-neutral-800 hover:bg-red-900 text-neutral-400 hover:text-red-300 text-xs rounded transition-colors"
                        title="Nuclear remove (glitch art)"
                      >
                        ☢
                      </button>
                    )}

                    {/* Restore — reverse a nuclear remove */}
                    {word.status === "admin_removed" && (
                      <button
                        onClick={() => performAction("restore", word.id)}
                        className="px-2 py-0.5 bg-neutral-800 hover:bg-emerald-900 text-neutral-400 hover:text-emerald-300 text-xs rounded transition-colors"
                        title="Restore to visible"
                      >
                        ♻
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

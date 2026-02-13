/**
 * Admin Panel — hidden moderation UI for content management.
 *
 * Features:
 * - Write (free, unrestricted characters, append or insert at position)
 * - Insert line breaks (enforced 10-word minimum spacing)
 * - Mass operations: checkbox selection + bulk actions
 * - Individual actions: flag, redact, admin lock, protect, uncover, nuclear, restore, delete
 * - Fuzzy search, sort, filter, CSV download
 * - Action log
 *
 * Inputs: None
 * Outputs: Full admin moderation interface
 * Side Effects: API calls to /api/admin, /api/words
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

interface AdminWord {
  readonly id: string;
  readonly position: number;
  readonly content: string | null;
  readonly content_length: number;
  readonly status: string;
  readonly flag_count: number;
  readonly created_at: string;
}

type AdminAction =
  | "write"
  | "insert_at"
  | "insert_linebreak"
  | "redact"
  | "admin_redact"
  | "uncover"
  | "nuclear_remove"
  | "restore"
  | "flag"
  | "unflag"
  | "delete"
  | "protect"
  | "unprotect";

type SortField = "position" | "content" | "status" | "length" | "flags" | "created";
type SortDir = "asc" | "desc";

const STATUS_OPTIONS = [
  "all",
  "visible",
  "protected",
  "flagged",
  "redacted",
  "admin_redacted",
  "admin_removed",
  "linebreak",
] as const;

/**
 * Simple fuzzy match — checks if all characters of the query appear
 * in order within the target string. O(n) per comparison.
 */
function fuzzyMatch(target: string, query: string): boolean {
  if (query.length === 0) return true;
  const t = target.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [words, setWords] = useState<AdminWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLog, setActionLog] = useState<string[]>([]);

  // Write/insert state
  const [writeInput, setWriteInput] = useState("");
  const [insertPosition, setInsertPosition] = useState("");
  const [writing, setWriting] = useState(false);

  // Mass selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Search / Sort / Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("position");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [minLength, setMinLength] = useState("");
  const [maxLength, setMaxLength] = useState("");

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
    if (authenticated) fetchWords();
  }, [authenticated, fetchWords]);

  // ── Filtered + sorted words (memoized) ──
  const filteredWords = useMemo(() => {
    const minLen = minLength ? parseInt(minLength, 10) : 0;
    const maxLen = maxLength ? parseInt(maxLength, 10) : Infinity;

    const filtered = words.filter((w) => {
      // Status filter
      if (statusFilter !== "all" && w.status !== statusFilter) return false;
      // Length filter
      if (w.content_length < minLen || w.content_length > maxLen) return false;
      // Fuzzy search
      if (searchQuery && !fuzzyMatch(w.content ?? "", searchQuery)) return false;
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "position": cmp = a.position - b.position; break;
        case "content": cmp = (a.content ?? "").localeCompare(b.content ?? ""); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "length": cmp = a.content_length - b.content_length; break;
        case "flags": cmp = a.flag_count - b.flag_count; break;
        case "created": cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [words, searchQuery, sortField, sortDir, statusFilter, minLength, maxLength]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) setAuthenticated(true);
  };

  const logAction = useCallback((msg: string) => {
    setActionLog((prev) => [msg, ...prev]);
  }, []);

  // ── API call helper ──
  const callAdmin = useCallback(
    async (body: Record<string, unknown>): Promise<{ ok: boolean; data: Record<string, unknown> }> => {
      try {
        const res = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-token": token },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        return { ok: res.ok, data };
      } catch {
        return { ok: false, data: { error: "network error" } };
      }
    },
    [token]
  );

  const performAction = useCallback(
    async (action: AdminAction, wordId?: string, extra?: Record<string, unknown>) => {
      const body: Record<string, unknown> = { action, ...extra };
      if (wordId) body.wordId = wordId;
      const { ok, data } = await callAdmin(body);
      const label = wordId ? `#${wordId.slice(0, 8)}…` : "";
      logAction(ok ? `✅ ${action} ${label}` : `❌ ${action} ${label} — ${data.error ?? "failed"}`);
      if (ok) fetchWords();
    },
    [callAdmin, logAction, fetchWords]
  );

  const handleNuclearRemove = useCallback(
    (wordId: string, content: string | null) => {
      if (!window.confirm(`Are you sure you want to NUCLEAR REMOVE "${content ?? "[hidden]"}"?`)) return;
      performAction("nuclear_remove", wordId);
    },
    [performAction]
  );

  const handleDelete = useCallback(
    (wordId: string, content: string | null) => {
      if (!window.confirm(`Permanently DELETE "${content ?? "[hidden]"}" from the database?`)) return;
      performAction("delete", wordId);
    },
    [performAction]
  );

  const handleWrite = useCallback(async () => {
    const text = writeInput.trim();
    if (!text) return;
    setWriting(true);
    const pos = parseInt(insertPosition, 10);
    if (insertPosition && !isNaN(pos)) {
      await performAction("insert_at", undefined, { wordContent: text, position: pos });
    } else {
      await performAction("write", undefined, { wordContent: text });
    }
    setWriteInput("");
    setInsertPosition("");
    setWriting(false);
  }, [writeInput, insertPosition, performAction]);

  const handleInsertLineBreak = useCallback(async () => {
    const pos = parseInt(insertPosition, 10);
    if (isNaN(pos)) {
      logAction("❌ Enter a position number for the line break");
      return;
    }
    await performAction("insert_linebreak", undefined, { position: pos });
    setInsertPosition("");
  }, [insertPosition, performAction, logAction]);

  // ── Selection helpers ──
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedIds(new Set(filteredWords.map((w) => w.id)));
  }, [filteredWords]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedCount = selectedIds.size;

  const batchAction = useCallback(
    async (action: AdminAction) => {
      if (selectedCount === 0) return;
      if (action === "nuclear_remove" || action === "delete") {
        if (!window.confirm(`${action.toUpperCase()} ${selectedCount} word(s)?`)) return;
      }
      for (const id of selectedIds) {
        await performAction(action, id);
      }
      setSelectedIds(new Set());
    },
    [selectedIds, selectedCount, performAction]
  );

  // ── CSV Export ──
  const downloadCSV = useCallback(() => {
    const headers = ["id", "position", "content", "content_length", "status", "flag_count", "created_at"];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = filteredWords.map((w) =>
      [w.id, w.position, w.content ?? "", w.content_length, w.status, w.flag_count, w.created_at]
        .map(String)
        .map(escape)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `words_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    logAction(`📥 Exported ${filteredWords.length} words to CSV`);
  }, [filteredWords, logAction]);

  // ── Sort toggle ──
  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }, [sortField]);

  // ── Login ──
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm p-6 bg-neutral-900 rounded-lg border border-neutral-800">
          <h1 className="text-white font-mono text-lg mb-4">[ ADMIN ACCESS ]</h1>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter admin token"
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm outline-none focus:border-amber-600 mb-3"
            autoFocus
          />
          <button type="submit" className="w-full py-2 bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium rounded transition-colors">
            Authenticate
          </button>
        </form>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-mono font-bold">[ ADMIN PANEL ]</h1>
          <div className="flex items-center gap-3">
            <span className="text-neutral-500 text-xs font-mono">
              {filteredWords.length}/{words.length} words
            </span>
            <button onClick={downloadCSV} className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-xs transition-colors" title="Download filtered words as CSV">
              📥 CSV
            </button>
            <button onClick={fetchWords} className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-xs transition-colors">
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-950 border border-red-800 rounded text-red-300 text-sm">{error}</div>
        )}

        {/* Write / Insert controls */}
        <div className="mb-4 flex flex-wrap items-center gap-2 px-4 py-3 bg-neutral-900 rounded-lg border border-amber-900/40">
          <span className="text-amber-500 text-sm font-medium shrink-0">Write:</span>
          <input
            type="text"
            value={writeInput}
            onChange={(e) => setWriteInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleWrite()}
            placeholder="Any text (each word = separate entry)..."
            maxLength={500}
            className="flex-1 min-w-[120px] bg-transparent text-white text-sm outline-none placeholder:text-neutral-500"
          />
          <input
            type="text"
            value={insertPosition}
            onChange={(e) => setInsertPosition(e.target.value.replace(/\D/g, ""))}
            placeholder="Position (blank=end)"
            className="w-36 bg-neutral-800 text-white text-xs px-2 py-1.5 rounded border border-neutral-700 outline-none focus:border-amber-600 placeholder:text-neutral-500"
          />
          <button
            onClick={handleWrite}
            disabled={!writeInput.trim() || writing}
            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-white text-xs font-medium rounded transition-colors"
          >
            {writing ? "…" : "Publish"}
          </button>
          <button
            onClick={handleInsertLineBreak}
            className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 text-xs rounded transition-colors"
            title="Insert line break at position (10-word minimum spacing enforced)"
          >
            ¶ Break
          </button>
        </div>

        {/* Search / Filter / Sort bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2 px-4 py-2.5 bg-neutral-900 rounded-lg border border-neutral-800">
          {/* Fuzzy search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search words..."
            className="flex-1 min-w-[140px] bg-neutral-800 text-white text-xs px-2.5 py-1.5 rounded border border-neutral-700 outline-none focus:border-amber-600 placeholder:text-neutral-500"
          />
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-neutral-800 text-white text-xs px-2 py-1.5 rounded border border-neutral-700 outline-none focus:border-amber-600"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s}
              </option>
            ))}
          </select>
          {/* Length range */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={minLength}
              onChange={(e) => setMinLength(e.target.value.replace(/\D/g, ""))}
              placeholder="Min len"
              className="w-16 bg-neutral-800 text-white text-xs px-2 py-1.5 rounded border border-neutral-700 outline-none focus:border-amber-600 placeholder:text-neutral-500"
            />
            <span className="text-neutral-600 text-xs">–</span>
            <input
              type="text"
              value={maxLength}
              onChange={(e) => setMaxLength(e.target.value.replace(/\D/g, ""))}
              placeholder="Max len"
              className="w-16 bg-neutral-800 text-white text-xs px-2 py-1.5 rounded border border-neutral-700 outline-none focus:border-amber-600 placeholder:text-neutral-500"
            />
          </div>
          {/* Sort */}
          <div className="flex items-center gap-1">
            <span className="text-neutral-500 text-xs">Sort:</span>
            {(["position", "content", "length", "flags", "status", "created"] as SortField[]).map((f) => (
              <button
                key={f}
                onClick={() => toggleSort(f)}
                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                  sortField === f
                    ? "bg-amber-900/50 text-amber-300"
                    : "bg-neutral-800 text-neutral-500 hover:text-white"
                }`}
              >
                {f === "position" ? "#" : f === "content" ? "Aa" : f === "length" ? "Len" : f === "flags" ? "🚩" : f === "created" ? "Date" : f}
                {sortField === f && (sortDir === "asc" ? " ↑" : " ↓")}
              </button>
            ))}
          </div>
          {/* Clear filters */}
          {(searchQuery || statusFilter !== "all" || minLength || maxLength) && (
            <button
              onClick={() => { setSearchQuery(""); setStatusFilter("all"); setMinLength(""); setMaxLength(""); }}
              className="text-neutral-500 text-xs hover:text-white"
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Batch actions bar */}
        {selectedCount > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 px-4 py-2 bg-neutral-900 rounded-lg border border-blue-900/40">
            <span className="text-blue-400 text-xs font-medium">{selectedCount} selected</span>
            <button onClick={deselectAll} className="text-neutral-500 text-xs hover:text-white">Clear</button>
            <span className="text-neutral-700">|</span>
            <button onClick={() => batchAction("redact")} className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-xs rounded">██ Redact</button>
            <button onClick={() => batchAction("admin_redact")} className="px-2 py-0.5 bg-neutral-800 hover:bg-purple-900 text-xs rounded text-purple-300">🔒 Lock</button>
            <button onClick={() => batchAction("nuclear_remove")} className="px-2 py-0.5 bg-neutral-800 hover:bg-red-900 text-xs rounded text-red-300">☢ Nuclear</button>
            <button onClick={() => batchAction("flag")} className="px-2 py-0.5 bg-neutral-800 hover:bg-amber-900 text-xs rounded text-amber-300">🚩+ Flag</button>
            <button onClick={() => batchAction("unflag")} className="px-2 py-0.5 bg-neutral-800 hover:bg-green-900 text-xs rounded text-green-300">🚩− Unflag</button>
            <button onClick={() => batchAction("protect")} className="px-2 py-0.5 bg-neutral-800 hover:bg-teal-900 text-xs rounded text-teal-300">🛡 Protect</button>
            <button onClick={() => batchAction("delete")} className="px-2 py-0.5 bg-red-900 hover:bg-red-800 text-xs rounded text-red-200">🗑 Delete</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Word list */}
          <div className="lg:col-span-2 space-y-1">
            {/* Select all row */}
            <div className="flex items-center gap-2 px-3 py-1 text-neutral-500 text-xs">
              <input
                type="checkbox"
                checked={selectedCount === filteredWords.length && filteredWords.length > 0}
                onChange={() => (selectedCount === filteredWords.length ? deselectAll() : selectAllFiltered())}
                className="accent-amber-600"
              />
              <span>Select all ({filteredWords.length})</span>
            </div>

            {loading ? (
              <p className="text-neutral-500 animate-pulse px-3">Loading...</p>
            ) : filteredWords.length === 0 ? (
              <p className="text-neutral-500 px-3">{words.length === 0 ? "No words yet." : "No matches."}</p>
            ) : (
              filteredWords.map((word) => (
                <div
                  key={word.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${
                    selectedIds.has(word.id)
                      ? "bg-blue-950/40 border-blue-800/50"
                      : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(word.id)}
                    onChange={() => toggleSelect(word.id)}
                    className="accent-amber-600 shrink-0"
                  />

                  {/* Position */}
                  <span className="text-neutral-600 text-xs font-mono w-8 shrink-0">
                    #{word.position}
                  </span>

                  {/* Content */}
                  <span
                    className={`flex-1 text-sm font-serif truncate ${
                      word.status === "linebreak"
                        ? "text-neutral-600 italic"
                        : word.status === "redacted" || word.status === "admin_redacted"
                        ? "text-neutral-600 line-through"
                        : word.status === "admin_removed"
                        ? "text-red-500 line-through"
                        : word.status === "flagged"
                        ? "text-amber-400"
                        : word.status === "protected"
                        ? "text-teal-300"
                        : "text-white"
                    }`}
                  >
                    {word.status === "linebreak" ? "¶ [line break]" : word.content ?? "[hidden]"}
                  </span>

                  {/* Length */}
                  <span className="text-neutral-600 text-[10px] font-mono w-6 text-right shrink-0">
                    {word.content_length}
                  </span>

                  {/* Status badge */}
                  <span
                    className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                      word.status === "visible"
                        ? "bg-green-950 text-green-400"
                        : word.status === "protected"
                        ? "bg-teal-950 text-teal-400"
                        : word.status === "linebreak"
                        ? "bg-cyan-950 text-cyan-400"
                        : word.status === "flagged"
                        ? "bg-amber-950 text-amber-400"
                        : word.status === "redacted"
                        ? "bg-neutral-800 text-neutral-400"
                        : word.status === "admin_redacted"
                        ? "bg-purple-950 text-purple-400"
                        : "bg-red-950 text-red-400"
                    }`}
                  >
                    {word.status === "admin_redacted" ? "🔒" : word.status === "linebreak" ? "¶" : word.status === "protected" ? "🛡" : word.status}
                  </span>

                  {/* Flag count */}
                  {word.flag_count > 0 && (
                    <span className="text-xs text-amber-500 shrink-0">🚩{word.flag_count}</span>
                  )}

                  {/* Individual actions */}
                  <div className="flex gap-1 shrink-0">
                    {/* Flag/unflag */}
                    {word.status !== "admin_removed" && word.status !== "admin_redacted" && word.status !== "linebreak" && word.status !== "protected" && (
                      <>
                        <button onClick={() => performAction("flag", word.id)} className="px-1.5 py-0.5 bg-neutral-800 hover:bg-amber-900 text-neutral-400 hover:text-amber-300 text-[10px] rounded" title="Flag">🚩+</button>
                        {word.flag_count > 0 && (
                          <button onClick={() => performAction("unflag", word.id)} className="px-1.5 py-0.5 bg-neutral-800 hover:bg-green-900 text-neutral-400 hover:text-green-300 text-[10px] rounded" title="Unflag">🚩−</button>
                        )}
                      </>
                    )}
                    {/* Redact */}
                    {(word.status === "visible" || word.status === "flagged") && (
                      <button onClick={() => performAction("redact", word.id)} className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white text-[10px] rounded" title="Redact">██</button>
                    )}
                    {/* Admin lock */}
                    {(word.status === "visible" || word.status === "flagged" || word.status === "redacted") && (
                      <button onClick={() => performAction("admin_redact", word.id)} className="px-1.5 py-0.5 bg-neutral-800 hover:bg-purple-900 text-neutral-400 hover:text-purple-300 text-[10px] rounded" title="Admin Lock">🔒</button>
                    )}
                    {/* Uncover */}
                    {(word.status === "redacted" || word.status === "admin_redacted") && (
                      <button onClick={() => performAction("uncover", word.id)} className="px-1.5 py-0.5 bg-neutral-800 hover:bg-blue-900 text-neutral-400 hover:text-blue-300 text-[10px] rounded" title="Uncover">👁</button>
                    )}
                    {/* Nuclear */}
                    {word.status !== "admin_removed" && word.status !== "linebreak" && (
                      <button onClick={() => handleNuclearRemove(word.id, word.content)} className="px-1.5 py-0.5 bg-neutral-800 hover:bg-red-900 text-neutral-400 hover:text-red-300 text-[10px] rounded" title="Nuclear">☢</button>
                    )}
                    {/* Restore */}
                    {word.status === "admin_removed" && (
                      <button onClick={() => performAction("restore", word.id)} className="px-1.5 py-0.5 bg-neutral-800 hover:bg-emerald-900 text-neutral-400 hover:text-emerald-300 text-[10px] rounded" title="Restore">♻</button>
                    )}
                    {/* Protect / Unprotect */}
                    {(word.status === "visible" || word.status === "flagged") && (
                      <button onClick={() => performAction("protect", word.id)} className="px-1.5 py-0.5 bg-neutral-800 hover:bg-teal-900 text-neutral-400 hover:text-teal-300 text-[10px] rounded" title="Protect from redaction">🛡</button>
                    )}
                    {word.status === "protected" && (
                      <button onClick={() => performAction("unprotect", word.id)} className="px-1.5 py-0.5 bg-neutral-800 hover:bg-teal-900 text-teal-400 hover:text-teal-200 text-[10px] rounded" title="Remove protection">🛡⁻</button>
                    )}
                    {/* Delete (hard) */}
                    <button onClick={() => handleDelete(word.id, word.content)} className="px-1.5 py-0.5 bg-neutral-800 hover:bg-red-900 text-neutral-400 hover:text-red-300 text-[10px] rounded" title="Delete from DB">🗑</button>
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
                  <p key={i} className="text-xs text-neutral-400 py-0.5 font-mono">{entry}</p>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

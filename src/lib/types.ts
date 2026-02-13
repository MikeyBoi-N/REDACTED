/**
 * Shared TypeScript types for the [ REDACTED ] application.
 *
 * Inputs: None (type definitions only)
 * Outputs: Exported types consumed by all API routes and components
 * Side Effects: None
 */

// ── Word Status Enum ──────────────────────────────────────────
export enum WordStatus {
  Pending = "pending",
  Visible = "visible",
  Protected = "protected",
  Flagged = "flagged",
  Redacted = "redacted",
  AdminRedacted = "admin_redacted",
  AdminRemoved = "admin_removed",
  LineBreak = "linebreak",
}

// ── Word Record (Database Row) ────────────────────────────────
export interface WordRecord {
  readonly id: string;
  readonly position: number;
  readonly content: string;
  readonly flag_count: number;
  readonly status: WordStatus;
  readonly stripe_payment_intent_id: string | null;
  readonly created_at: string;
  readonly session_fingerprint: string | null;
}

// ── API Response (content stripped for redacted / admin_removed) ──
export interface ApiWordResponse {
  readonly id: string;
  readonly position: number;
  readonly content: string | null; // null when redacted or admin_removed
  readonly content_length: number; // real char count — always available for bar sizing
  readonly flag_count: number;
  readonly status: WordStatus;
}

// ── Cart Action Types ─────────────────────────────────────────
export enum CartActionType {
  Write = "write",
  Redact = "redact",
  Uncover = "uncover",
  Flag = "flag",
}

// ── Cart Action ───────────────────────────────────────────────
export interface CartAction {
  readonly type: CartActionType;
  readonly wordId?: string; // null for "write" actions
  readonly wordContent?: string; // only for "write" actions
  readonly price: number; // 0 for flags
}

// ── Checkout Request ──────────────────────────────────────────
export interface CheckoutRequest {
  readonly actions: readonly CartAction[];
  readonly totalAmount: number;
}

// ── Checkout Status Response ──────────────────────────────────
export interface CheckoutStatusResponse {
  readonly status: "pending" | "processing" | "completed" | "failed";
  readonly results?: readonly ActionResult[];
}

export interface ActionResult {
  readonly type: CartActionType;
  readonly wordId: string;
  readonly success: boolean;
  readonly reason?: string;
}

// ── Admin Action ──────────────────────────────────────────────
export enum AdminActionType {
  Write = "write",
  InsertAt = "insert_at",
  InsertLineBreak = "insert_linebreak",
  Redact = "redact",
  AdminRedact = "admin_redact",
  Uncover = "uncover",
  NuclearRemove = "nuclear_remove",
  Restore = "restore",
  Flag = "flag",
  Unflag = "unflag",
  Delete = "delete",
  Protect = "protect",
  Unprotect = "unprotect",
  Reorder = "reorder",
  Edit = "edit",
}

export interface AdminActionRequest {
  readonly action: AdminActionType;
  readonly wordId?: string;
  readonly wordContent?: string;
  readonly position?: number;
  readonly newPosition?: number;
}

// ── Pricing Constants (Single Source of Truth) ────────────────
export const PRICING = {
  WRITE: 1.0,
  REDACT: 2.0,
  UNCOVER: 2.0,
  FLAG: 0.0,
  STRIPE_MINIMUM: 0.5,
} as const;

// ── Validation Constants ──────────────────────────────────────
export const VALIDATION = {
  MAX_WORD_LENGTH: 20,
  MIN_WORD_LENGTH: 1,
  MAX_FLAG_COUNT: 20,
  FLAG_RATE_LIMIT: 100,
} as const;

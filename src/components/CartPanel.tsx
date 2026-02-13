/**
 * CartPanel component — slide-out cart review panel with integrated Stripe payment.
 *
 * Features:
 *   - Checkbox selection on each item
 *   - "Select All" toggle
 *   - Trash icon to bulk-delete selected items
 *   - Two states: cart review → payment form (after PaymentIntent created)
 *
 * Inputs: Cart actions, payment state, handlers
 * Outputs: Rendered cart panel overlay
 * Side Effects: None (checkout handled by parent)
 */

"use client";

import { useState, useCallback } from "react";
import { CartAction, CartActionType, PRICING } from "@/lib/types";
import PaymentForm from "./PaymentForm";

interface CartPanelProps {
  readonly isOpen: boolean;
  readonly actions: CartAction[];
  readonly total: number;
  readonly meetsMinimum: boolean;
  readonly onClose: () => void;
  readonly onRemoveActions: (indices: number[]) => void;
  readonly onCheckout: () => void;
  readonly isCheckingOut: boolean;
  readonly clientSecret: string | null;
  readonly onPaymentSuccess: () => void;
  readonly onPaymentError: (message: string) => void;
  readonly onPaymentCancel: () => void;
}

function actionLabel(action: CartAction): string {
  switch (action.type) {
    case CartActionType.Write:
      return `Write: "${action.wordContent}"`;
    case CartActionType.Redact:
      return `Redact word`;
    case CartActionType.Uncover:
      return `Uncover word`;
    case CartActionType.Flag:
      return `Flag word`;
    default:
      return "Unknown action";
  }
}

function actionPrice(action: CartAction): string {
  if (action.price === 0) return "Free";
  return `$${action.price.toFixed(2)}`;
}

export default function CartPanel({
  isOpen,
  actions,
  total,
  meetsMinimum,
  onClose,
  onRemoveActions,
  onCheckout,
  isCheckingOut,
  clientSecret,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel,
}: CartPanelProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const showPaymentForm = clientSecret !== null;

  const toggleItem = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === actions.length) {
        return new Set();
      }
      return new Set(actions.map((_, i) => i));
    });
  }, [actions]);

  const handleDeleteSelected = useCallback(() => {
    if (selected.size === 0) return;
    // Sort descending so removing doesn't shift indices
    const indices = Array.from(selected).sort((a, b) => b - a);
    onRemoveActions(indices);
    setSelected(new Set());
  }, [selected, onRemoveActions]);

  if (!isOpen) return null;

  const allSelected = actions.length > 0 && selected.size === actions.length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={showPaymentForm ? undefined : onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm bg-neutral-950 border-l border-neutral-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <h2 className="text-white font-medium">
            {showPaymentForm ? "Complete Payment" : "Your Edits"}
          </h2>
          <div className="flex items-center gap-2">
            {!showPaymentForm && actions.length > 0 && (
              <>
                {/* Select All checkbox */}
                <button
                  onClick={toggleSelectAll}
                  className="text-neutral-500 hover:text-white text-xs px-1.5 py-0.5 rounded border border-neutral-700 hover:border-neutral-500 transition-colors"
                  title={allSelected ? "Deselect all" : "Select all"}
                >
                  {allSelected ? "☑ All" : "☐ All"}
                </button>
                {/* Trash button — visible when items are selected */}
                {selected.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-950/50 transition-colors"
                    title={`Remove ${selected.size} item(s)`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </>
            )}
            {!showPaymentForm && (
              <button
                onClick={onClose}
                className="text-neutral-500 hover:text-white text-lg"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {showPaymentForm ? (
          /* ── Payment Form State ── */
          <div className="flex-1 overflow-y-auto p-4">
            {/* Order summary */}
            <div className="mb-4 pb-4 border-b border-neutral-800">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
                Order Summary
              </p>
              {actions.map((action, index) => (
                <div
                  key={index}
                  className="flex justify-between text-sm py-1"
                >
                  <span className="text-neutral-400 truncate">
                    {actionLabel(action)}
                  </span>
                  <span className="text-neutral-500 shrink-0 ml-2">
                    {actionPrice(action)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-medium pt-2 mt-2 border-t border-neutral-800">
                <span className="text-white">Total</span>
                <span className="text-amber-500 font-mono">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Stripe Elements form */}
            <PaymentForm
              clientSecret={clientSecret}
              amount={total}
              onSuccess={onPaymentSuccess}
              onError={onPaymentError}
              onCancel={onPaymentCancel}
            />
          </div>
        ) : (
          /* ── Cart Review State ── */
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {actions.length === 0 ? (
                <p className="text-neutral-500 text-sm text-center py-8">
                  No edits yet. Use the toolbar to add words, redact, uncover, or
                  flag.
                </p>
              ) : (
                actions.map((action, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors ${
                      selected.has(index)
                        ? "bg-neutral-800 border-neutral-600"
                        : "bg-neutral-900 border-neutral-800"
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleItem(index)}
                      className="text-neutral-500 hover:text-white shrink-0"
                    >
                      {selected.has(index) ? "☑" : "☐"}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-300 truncate">
                        {actionLabel(action)}
                      </p>
                    </div>
                    <span className="text-xs text-neutral-500 shrink-0">
                      {actionPrice(action)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Footer with checkout button */}
            {actions.length > 0 && (
              <div className="p-4 border-t border-neutral-800 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Total</span>
                  <span className="text-white font-mono font-medium">
                    ${total.toFixed(2)}
                  </span>
                </div>

                {!meetsMinimum && total > 0 && (
                  <p className="text-amber-500 text-xs">
                    Minimum checkout is ${PRICING.STRIPE_MINIMUM.toFixed(2)}
                  </p>
                )}

                <button
                  onClick={onCheckout}
                  disabled={!meetsMinimum || isCheckingOut}
                  className="w-full py-2.5 bg-amber-700 hover:bg-amber-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isCheckingOut
                    ? "Creating checkout..."
                    : `Proceed to Pay $${total.toFixed(2)}`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

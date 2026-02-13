/**
 * CartPanel component — slide-out cart review panel.
 *
 * Shows pending actions, total, and checkout button.
 * Validates Stripe minimum before allowing checkout.
 *
 * Inputs: Cart actions, handlers
 * Outputs: Rendered cart panel overlay
 * Side Effects: Calls /api/checkout on submit
 */

"use client";

import { CartAction, CartActionType, PRICING } from "@/lib/types";

interface CartPanelProps {
  readonly isOpen: boolean;
  readonly actions: CartAction[];
  readonly total: number;
  readonly meetsMinimum: boolean;
  readonly onClose: () => void;
  readonly onRemoveAction: (index: number) => void;
  readonly onCheckout: () => void;
  readonly isCheckingOut: boolean;
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
  onRemoveAction,
  onCheckout,
  isCheckingOut,
}: CartPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm bg-neutral-950 border-l border-neutral-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <h2 className="text-white font-medium">Your Edits</h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white text-lg"
          >
            ✕
          </button>
        </div>

        {/* Actions list */}
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
                className="flex items-center justify-between gap-2 px-3 py-2 bg-neutral-900 rounded border border-neutral-800"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-300 truncate">
                    {actionLabel(action)}
                  </p>
                </div>
                <span className="text-xs text-neutral-500 shrink-0">
                  {actionPrice(action)}
                </span>
                <button
                  onClick={() => onRemoveAction(index)}
                  className="text-neutral-600 hover:text-red-400 text-xs shrink-0"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
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
              {isCheckingOut ? "Processing..." : `Confirm & Pay $${total.toFixed(2)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

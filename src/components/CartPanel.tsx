/**
 * CartPanel component — slide-out cart review panel with integrated Stripe payment.
 *
 * Two states:
 *   1. Cart review: shows pending actions, total, and "Proceed to Pay" button
 *   2. Payment form: shows Stripe Elements card input after PaymentIntent is created
 *
 * Inputs: Cart actions, payment state, handlers
 * Outputs: Rendered cart panel overlay
 * Side Effects: None (checkout handled by parent)
 */

"use client";

import { CartAction, CartActionType, PRICING } from "@/lib/types";
import PaymentForm from "./PaymentForm";

interface CartPanelProps {
  readonly isOpen: boolean;
  readonly actions: CartAction[];
  readonly total: number;
  readonly meetsMinimum: boolean;
  readonly onClose: () => void;
  readonly onRemoveAction: (index: number) => void;
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
  onRemoveAction,
  onCheckout,
  isCheckingOut,
  clientSecret,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel,
}: CartPanelProps) {
  if (!isOpen) return null;

  const showPaymentForm = clientSecret !== null;

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
          {!showPaymentForm && (
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-white text-lg"
            >
              ✕
            </button>
          )}
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

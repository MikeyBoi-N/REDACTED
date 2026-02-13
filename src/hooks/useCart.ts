/**
 * Cart state management hook (sessionStorage).
 *
 * Inputs: None (reads from sessionStorage)
 * Outputs: Cart state, action handlers, total calculations
 * Side Effects: Reads/writes sessionStorage
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { CartAction, CartActionType, PRICING } from "@/lib/types";

const CART_STORAGE_KEY = "redacted_cart";

function loadCart(): CartAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(actions: CartAction[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(actions));
}

export function useCart() {
  const [actions, setActions] = useState<CartAction[]>([]);

  // Load cart from sessionStorage on mount
  useEffect(() => {
    setActions(loadCart());
  }, []);

  // Persist cart to sessionStorage on change
  useEffect(() => {
    saveCart(actions);
  }, [actions]);

  const total = actions.reduce((sum, a) => sum + a.price, 0);
  const itemCount = actions.length;
  const meetsMinimum = total >= PRICING.STRIPE_MINIMUM;

  /** Adds a write action to the cart. */
  const addWrite = useCallback((wordContent: string) => {
    setActions((prev) => [
      ...prev,
      {
        type: CartActionType.Write,
        wordContent,
        price: PRICING.WRITE,
      },
    ]);
  }, []);

  /** Adds a redact action to the cart. */
  const addRedact = useCallback((wordId: string) => {
    setActions((prev) => {
      // Prevent conflicting actions on same word
      if (prev.some((a) => a.wordId === wordId)) return prev;
      return [
        ...prev,
        { type: CartActionType.Redact, wordId, price: PRICING.REDACT },
      ];
    });
  }, []);

  /** Adds an uncover action to the cart. */
  const addUncover = useCallback((wordId: string) => {
    setActions((prev) => {
      if (prev.some((a) => a.wordId === wordId)) return prev;
      return [
        ...prev,
        { type: CartActionType.Uncover, wordId, price: PRICING.UNCOVER },
      ];
    });
  }, []);

  /** Removes an action from the cart by index. */
  const removeAction = useCallback((index: number) => {
    setActions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /** Clears the entire cart. */
  const clearCart = useCallback(() => {
    setActions([]);
  }, []);

  return {
    actions,
    total,
    itemCount,
    meetsMinimum,
    addWrite,
    addRedact,
    addUncover,
    removeAction,
    clearCart,
  };
}

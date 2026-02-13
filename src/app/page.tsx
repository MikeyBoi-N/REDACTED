/**
 * Main story page — composes all components.
 *
 * Layout: Header (top, fixed) + Sidebar (overlay, fixed) + StoryView (center) + Toolbar (bottom)
 * This is the single entry point for the application.
 *
 * Inputs: None (fetches data via hooks)
 * Outputs: Full page render
 * Side Effects: API calls via hooks
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import StoryView from "@/components/StoryView";
import Toolbar from "@/components/Toolbar";
import CartPanel from "@/components/CartPanel";
import Toast, { ToastMessage } from "@/components/Toast";
import { useCart } from "@/hooks/useCart";
import { useStory } from "@/hooks/useStory";
import { WordStatus } from "@/lib/types";

type ToolMode = "write" | "redact" | "uncover" | "flag" | null;

export default function Home() {
  const story = useStory();
  const cart = useCart();

  const [activeMode, setActiveMode] = useState<ToolMode>(null);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [cartOpen, setCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  // Initialize as false; hydrate from sessionStorage on mount
  const [showWriteTooltip, setShowWriteTooltip] = useState(false);

  // Hydrate tooltip state from sessionStorage
  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem("redacted_tooltip_dismissed");
      if (dismissed !== "true") {
        setShowWriteTooltip(true);
      }
    } catch {
      setShowWriteTooltip(true);
    }
  }, []);

  // Ref for cart pulse animation
  const cartPulseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [cartPulse, setCartPulse] = useState(false);

  const triggerCartPulse = useCallback(() => {
    if (cartPulseTimeoutRef.current) clearTimeout(cartPulseTimeoutRef.current);
    setCartPulse(true);
    cartPulseTimeoutRef.current = setTimeout(() => setCartPulse(false), 800);
  }, []);

  // Stable ref for story.refresh — avoids dependency cascade in callbacks
  const storyRefreshRef = useRef(story.refresh);
  useEffect(() => {
    storyRefreshRef.current = story.refresh;
  }, [story.refresh]);

  // ── Toast helpers ──
  const addToast = useCallback(
    (type: ToastMessage["type"], text: string) => {
      const id = uuidv4();
      setToasts((prev) => [...prev, { id, type, text }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Mode change ──
  const handleModeChange = useCallback((mode: ToolMode) => {
    setActiveMode(mode);
    setSelectedWords(new Set());
  }, []);

  // ── Word interactions (toggleable selections) ──
  const handleWordClick = useCallback(
    (wordId: string) => {
      if (!activeMode || activeMode === "write") return;

      const word = story.words.find((w) => w.id === wordId);
      if (!word) return;

      if (activeMode === "redact") {
        if (word.status === WordStatus.Redacted || word.status === WordStatus.AdminRemoved) {
          addToast("error", "This word is already redacted.");
          return;
        }

        // Toggle
        if (selectedWords.has(wordId)) {
          cart.removeActionByWordId(wordId);
          setSelectedWords((prev) => {
            const next = new Set(prev);
            next.delete(wordId);
            return next;
          });
          addToast("info", "Removed redaction from cart.");
          return;
        }

        cart.addRedact(wordId);
        setSelectedWords((prev) => new Set(prev).add(wordId));
        addToast("info", `Added redaction to cart ($2.00)`);
        triggerCartPulse();
      }

      if (activeMode === "uncover") {
        if (word.status !== WordStatus.Redacted) {
          addToast("error", "Only redacted words can be uncovered.");
          return;
        }

        // Toggle
        if (selectedWords.has(wordId)) {
          cart.removeActionByWordId(wordId);
          setSelectedWords((prev) => {
            const next = new Set(prev);
            next.delete(wordId);
            return next;
          });
          addToast("info", "Removed uncover from cart.");
          return;
        }

        cart.addUncover(wordId);
        setSelectedWords((prev) => new Set(prev).add(wordId));
        addToast("info", `Added uncover to cart ($2.00)`);
        triggerCartPulse();
      }

      if (activeMode === "flag") {
        if (word.status === WordStatus.Redacted || word.status === WordStatus.AdminRemoved) {
          addToast("error", "Cannot flag this word.");
          return;
        }
        handleFlagWord(wordId);
      }
    },
    [activeMode, story.words, cart, addToast, selectedWords, triggerCartPulse]
  );

  // ── Flag directly (no Stripe) ──
  const handleFlagWord = useCallback(
    async (wordId: string) => {
      try {
        const response = await fetch("/api/flag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wordId,
            visitorId: "anonymous", // TODO: replace with FingerprintJS visitorId
          }),
        });

        if (response.ok) {
          story.refresh();
        } else {
          const data = await response.json();
          addToast("error", data.error || "Failed to flag word.");
        }
      } catch {
        addToast("error", "Failed to flag word.");
      }
    },
    [story, addToast]
  );

  // ── Write submission (multi-word support) ──
  const handleWriteSubmit = useCallback(
    (words: string[]) => {
      if (words.length === 0) {
        addToast("error", "Please enter a valid word (max 20 chars each, max 100 words).");
        return;
      }

      if (words.length > 100) {
        addToast("info", "Easy there — max 100 words at a time. Break it up a bit.");
        return;
      }

      for (const word of words) {
        cart.addWrite(word);
      }

      const totalPrice = words.length * 1;
      if (words.length === 1) {
        addToast("info", `Added "${words[0]}" to cart ($1.00)`);
      } else {
        addToast("info", `Added ${words.length} words to cart ($${totalPrice.toFixed(2)})`);
      }
      triggerCartPulse();
    },
    [cart, addToast, triggerCartPulse]
  );

  // ── Checkout: creates PaymentIntent and shows payment form ──
  const handleCheckout = useCallback(async () => {
    if (!cart.meetsMinimum) return;

    setIsCheckingOut(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actions: cart.actions,
          totalAmount: cart.total,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        addToast("error", data.error || "Checkout failed.");
        return;
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch {
      addToast("error", "Checkout failed. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  }, [cart, addToast]);

  // ── Payment success ──
  const handlePaymentSuccess = useCallback(() => {
    addToast("success", "Payment successful! Your edit will appear shortly.");
    setClientSecret(null);
    cart.clearCart();
    setCartOpen(false);
    setSelectedWords(new Set());
    setActiveMode(null);

    // Retry 3 times with increasing delay to pick up webhook-processed changes.
    // Uses a ref so this callback never depends on the `story` object.
    setTimeout(() => storyRefreshRef.current(), 2000);
    setTimeout(() => storyRefreshRef.current(), 5000);
    setTimeout(() => storyRefreshRef.current(), 10000);
  }, [cart, addToast]);

  // ── Payment error ──
  const handlePaymentError = useCallback(
    (message: string) => {
      addToast("error", message);
    },
    [addToast]
  );

  // ── Payment cancel: go back to cart review ──
  const handlePaymentCancel = useCallback(() => {
    setClientSecret(null);
  }, []);

  // ── Batch remove cart actions (for select + trash) ──
  const handleRemoveActions = useCallback(
    (indices: number[]) => {
      cart.removeActions(indices);
    },
    [cart]
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        activeMode={activeMode}
        cartItemCount={cart.itemCount}
        onCartOpen={() => setCartOpen(true)}
      />

      {/* Sidebar is fixed-positioned overlay — does not affect layout */}
      <Sidebar />

      <StoryView
        words={story.words}
        wordCount={story.wordCount}
        loading={story.loading}
        interactionMode={activeMode === "write" ? null : activeMode}
        selectedWords={selectedWords}
        onWordClick={handleWordClick}
      />

      <Toolbar
        activeMode={activeMode}
        onModeChange={handleModeChange}
        onWriteSubmit={handleWriteSubmit}
        showWriteTooltip={showWriteTooltip}
        onDismissTooltip={() => {
          setShowWriteTooltip(false);
          try {
            sessionStorage.setItem("redacted_tooltip_dismissed", "true");
          } catch { /* ignore */ }
        }}
      />

      <CartPanel
        isOpen={cartOpen}
        actions={cart.actions}
        total={cart.total}
        meetsMinimum={cart.meetsMinimum}
        onClose={() => setCartOpen(false)}
        onRemoveActions={handleRemoveActions}
        onCheckout={handleCheckout}
        isCheckingOut={isCheckingOut}
        clientSecret={clientSecret}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
        onPaymentCancel={handlePaymentCancel}
      />

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

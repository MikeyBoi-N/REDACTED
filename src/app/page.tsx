/**
 * Main story page — composes all components.
 *
 * Layout: Header (top) + Sidebar (left) + StoryView (center) + Toolbar (bottom)
 * This is the single entry point for the application.
 *
 * Inputs: None (fetches data via hooks)
 * Outputs: Full page render
 * Side Effects: API calls via hooks
 */

"use client";

import { useState, useCallback } from "react";
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

  // ── Word interactions ──
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
        cart.addRedact(wordId);
        setSelectedWords((prev) => new Set(prev).add(wordId));
        addToast("info", `Added redaction to cart ($2.00)`);
      }

      if (activeMode === "uncover") {
        if (word.status !== WordStatus.Redacted) {
          addToast("error", "Only redacted words can be uncovered.");
          return;
        }
        cart.addUncover(wordId);
        setSelectedWords((prev) => new Set(prev).add(wordId));
        addToast("info", `Added uncover to cart ($2.00)`);
      }

      if (activeMode === "flag") {
        if (word.status === WordStatus.Redacted || word.status === WordStatus.AdminRemoved) {
          addToast("error", "Cannot flag this word.");
          return;
        }
        handleFlagWord(wordId);
      }
    },
    [activeMode, story.words, cart, addToast]
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

  // ── Write submission ──
  const handleWriteSubmit = useCallback(
    (word: string) => {
      cart.addWrite(word);
      addToast("info", `Added "${word}" to cart ($1.00)`);
    },
    [cart, addToast]
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
      // Show the Stripe payment form with the clientSecret
      setClientSecret(data.clientSecret);
    } catch {
      addToast("error", "Checkout failed. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  }, [cart, addToast]);

  // ── Payment success: card charged, webhook will process actions ──
  const handlePaymentSuccess = useCallback(() => {
    addToast("success", "Payment successful! Your edit will appear shortly.");
    setClientSecret(null);
    cart.clearCart();
    setCartOpen(false);
    setSelectedWords(new Set());
    setActiveMode(null);

    // Poll for story update (webhook processes asynchronously)
    const pollInterval = setInterval(() => {
      story.refresh();
    }, 2000);

    // Stop polling after 15 seconds
    setTimeout(() => clearInterval(pollInterval), 15000);
  }, [cart, addToast, story]);

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header cartTotal={cart.total} />

      <div className="flex flex-1">
        <Sidebar />
        <StoryView
          words={story.words}
          wordCount={story.wordCount}
          loading={story.loading}
          interactionMode={activeMode === "write" ? null : activeMode}
          selectedWords={selectedWords}
          onWordClick={handleWordClick}
        />
      </div>

      <Toolbar
        activeMode={activeMode}
        onModeChange={handleModeChange}
        onWriteSubmit={handleWriteSubmit}
        cartItemCount={cart.itemCount}
        onCartOpen={() => setCartOpen(true)}
      />

      <CartPanel
        isOpen={cartOpen}
        actions={cart.actions}
        total={cart.total}
        meetsMinimum={cart.meetsMinimum}
        onClose={() => setCartOpen(false)}
        onRemoveAction={cart.removeAction}
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

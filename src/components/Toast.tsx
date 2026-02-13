/**
 * Toast notification component — dismissable success/failure toasts.
 *
 * Inputs: Toast messages array with type and text
 * Outputs: Rendered toast stack
 * Side Effects: Auto-dismisses after timeout
 */

"use client";

import { useState, useEffect, useCallback } from "react";

export interface ToastMessage {
  readonly id: string;
  readonly type: "success" | "error" | "info";
  readonly text: string;
}

interface ToastProps {
  readonly toasts: ToastMessage[];
  readonly onDismiss: (id: string) => void;
}

export default function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgColor =
    toast.type === "success"
      ? "bg-green-900/90 border-green-700"
      : toast.type === "error"
      ? "bg-red-900/90 border-red-700"
      : "bg-neutral-800/90 border-neutral-600";

  return (
    <div
      className={`flex items-start gap-2 px-4 py-3 rounded-lg border shadow-lg text-sm text-white animate-slide-in ${bgColor}`}
    >
      <span className="flex-1">{toast.text}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-neutral-400 hover:text-white shrink-0"
      >
        ✕
      </button>
    </div>
  );
}

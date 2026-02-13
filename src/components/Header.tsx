/**
 * Header component — top bar with [ REDACTED ] logo and cart balance.
 *
 * Inputs: cartTotal (number)
 * Outputs: Rendered header bar
 * Side Effects: None
 */

"use client";

interface HeaderProps {
  readonly cartTotal: number;
}

export default function Header({ cartTotal }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-neutral-950 border-b border-neutral-800">
      <h1 className="text-xl font-bold tracking-tight text-white font-mono">
        [ REDACTED ]
      </h1>
      <div className="px-4 py-1.5 bg-neutral-800 rounded text-sm text-neutral-300 font-mono">
        Balance: ${cartTotal.toFixed(2)}
      </div>
    </header>
  );
}

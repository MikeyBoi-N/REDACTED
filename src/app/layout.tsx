/**
 * Root layout — sets up dark theme, fonts, and page metadata.
 *
 * Inputs: Children components
 * Outputs: HTML document with theme and font configuration
 * Side Effects: None
 */

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "[ REDACTED ]",
  description:
    "Pay $1 to add one word to an endless, crowd-authored story. No AI. No algorithm. Just humans, writing one word at a time. A philosophical experiment in collective expression.",
  keywords: [
    "crowd writing",
    "collaborative story",
    "pay to write",
    "internet art",
    "collective unconscious",
    "social experiment",
  ],
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "[ REDACTED ]",
    description: "An unsanctioned novel being written by the internet.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-neutral-950 text-white antialiased min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}


"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";

interface StatsData {
  wordCount: number;
  redactionCount: number;
  flagCount: number;
  moneySpent: number;
  longestWord: string;
  topWords: Array<{ word: string; count: number }>;
}

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-serif">
      <Header activeMode={null} cartItemCount={0} onCartOpen={() => {}} />

      <main className="max-w-4xl mx-auto pt-24 pb-12 px-6">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-mono font-bold mb-4 tracking-tight">
            [ STATISTICAL INSIGHTS ]
          </h1>
          <p className="text-neutral-400 max-w-lg mx-auto italic">
            "We drown in information, while starving for wisdom."
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-pulse text-neutral-600 font-mono">
              [ AGGREGATING DATA... ]
            </div>
          </div>
        ) : !data ? (
          <div className="text-center text-red-400 py-10">
            Failed to load statistics.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Box 1: Money */}
            <div className="p-8 bg-neutral-900/50 border border-neutral-800 rounded-lg backdrop-blur">
              <h2 className="text-neutral-500 font-mono text-sm uppercase tracking-widest mb-2">
                Total Value
              </h2>
              <div className="text-5xl text-emerald-400 font-bold font-mono">
                ${data.moneySpent.toLocaleString()}
              </div>
              <p className="text-neutral-600 text-sm mt-2">
                Currency exchanged for permanence.
              </p>
            </div>

            {/* Box 2: Volume */}
            <div className="p-8 bg-neutral-900/50 border border-neutral-800 rounded-lg backdrop-blur">
              <h2 className="text-neutral-500 font-mono text-sm uppercase tracking-widest mb-2">
                Total Words
              </h2>
              <div className="text-5xl text-white font-bold font-mono">
                {data.wordCount.toLocaleString()}
              </div>
              <p className="text-neutral-600 text-sm mt-2">
                Human thoughts recorded.
              </p>
            </div>

            {/* Box 3: Censorship */}
            <div className="p-8 bg-neutral-900/50 border border-neutral-800 rounded-lg backdrop-blur md:col-span-2">
              <div className="flex flex-col md:flex-row gap-8 justify-between">
                <div>
                  <h2 className="text-neutral-500 font-mono text-sm uppercase tracking-widest mb-2">
                    Censorship Index
                  </h2>
                  <div className="text-5xl text-red-400 font-bold font-mono">
                    {data.redactionCount.toLocaleString()}
                  </div>
                  <p className="text-neutral-600 text-sm mt-2">
                    Words redacted or admin-locked.
                  </p>
                </div>
                <div className="border-l border-neutral-800 pl-8 md:min-w-[200px]">
                  <h2 className="text-neutral-500 font-mono text-sm uppercase tracking-widest mb-2">
                    Flags Raised
                  </h2>
                  <div className="text-4xl text-amber-500 font-bold font-mono">
                    {data.flagCount.toLocaleString()}
                  </div>
                  <p className="text-neutral-600 text-sm mt-2">
                    Community moderation alerts.
                  </p>
                </div>
              </div>
            </div>

            {/* Box 4: Linguistics */}
            <div className="p-8 bg-neutral-900/50 border border-neutral-800 rounded-lg backdrop-blur md:col-span-2">
              <h2 className="text-neutral-500 font-mono text-sm uppercase tracking-widest mb-6">
                Linguistic Patterns (Top 5 &gt;3 chars)
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {data.topWords.map((item, i) => (
                  <div key={item.word} className="text-center p-3 bg-neutral-950 rounded border border-neutral-800">
                    <div className="text-xl text-amber-200 font-bold mb-1">
                      {item.word}
                    </div>
                    <div className="text-neutral-600 text-xs font-mono">
                      {item.count}x
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-neutral-800 flex items-center justify-between">
                <span className="text-neutral-500 text-sm">Longest Word Record:</span>
                <span className="text-white font-mono text-lg break-all">
                  {data.longestWord}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono text-sm rounded border border-neutral-700 transition-colors"
          >
            ← RETURN TO STORY
          </Link>
        </div>
      </main>
    </div>
  );
}

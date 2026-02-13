/**
 * StoryView component — the infinite scrolling story document.
 * Renders the story as a continuous parchment-colored panel, always centered.
 *
 * Inputs: words array, interaction mode, selected words, word click handler
 * Outputs: Rendered story document
 * Side Effects: None
 */

"use client";

import { ApiWordResponse } from "@/lib/types";
import Word from "./Word";

interface StoryViewProps {
  readonly words: ApiWordResponse[];
  readonly wordCount: number;
  readonly loading: boolean;
  readonly interactionMode: "redact" | "uncover" | "flag" | null;
  readonly selectedWords: Set<string>;
  readonly onWordClick: (wordId: string) => void;
}

export default function StoryView({
  words,
  wordCount,
  loading,
  interactionMode,
  selectedWords,
  onWordClick,
}: StoryViewProps) {
  return (
    <div className="flex-1 flex justify-center min-h-0 pt-16 pb-24 px-4 md:px-8">
      {/* Story document — parchment paper look, always centered */}
      <div className="flex-1 max-w-3xl overflow-y-auto">
        <div
          className="min-h-full p-8 md:p-12 rounded-sm shadow-2xl"
          style={{ backgroundColor: "#f0e6d3" }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-neutral-500 animate-pulse">
                Loading the story...
              </div>
            </div>
          ) : words.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-neutral-500 italic text-center">
                The story hasn&apos;t begun yet.
                <br />
                <span className="text-sm">Be the first to write a word.</span>
              </p>
            </div>
          ) : (
            <div className="text-neutral-900 text-lg leading-relaxed font-serif">
              {words.map((word, index) => (
                <span key={word.id}>
                  <Word
                    word={word}
                    interactionMode={interactionMode}
                    isSelected={selectedWords.has(word.id)}
                    onWordClick={onWordClick}
                  />
                  {index < words.length - 1 && " "}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Word count — bottom right */}
      <div className="fixed bottom-4 right-6 text-neutral-500 text-sm font-mono z-40">
        {wordCount} words
      </div>
    </div>
  );
}

/**
 * Story fetching hook — loads the story from the API.
 *
 * Returns memoized object to avoid dependency cascade in consumers.
 *
 * Inputs: None
 * Outputs: Story words array, word count, loading state, refresh function
 * Side Effects: Fetches from /api/words
 */

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { ApiWordResponse } from "@/lib/types";

interface StoryState {
  readonly words: ApiWordResponse[];
  readonly wordCount: number;
  readonly loading: boolean;
  readonly error: string | null;
}

export function useStory() {
  const [state, setState] = useState<StoryState>({
    words: [],
    wordCount: 0,
    loading: true,
    error: null,
  });

  const fetchStory = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await fetch("/api/words");

      if (!response.ok) {
        throw new Error(`Failed to fetch story: ${response.status}`);
      }

      const data = await response.json();
      setState({
        words: data.words ?? [],
        wordCount: data.wordCount ?? 0,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch story.",
      }));
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchStory();
  }, [fetchStory]);

  // Return a memoized object so consumers don't re-render just because
  // the hook's internal state object gets recreated.
  return useMemo(
    () => ({
      words: state.words,
      wordCount: state.wordCount,
      loading: state.loading,
      error: state.error,
      refresh: fetchStory,
    }),
    [state.words, state.wordCount, state.loading, state.error, fetchStory]
  );
}

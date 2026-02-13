/**
 * Story fetching hook — loads the story from the API.
 *
 * Inputs: None
 * Outputs: Story words array, word count, loading state, refresh function
 * Side Effects: Fetches from /api/words
 */

"use client";

import { useState, useCallback, useEffect } from "react";
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

  return {
    ...state,
    refresh: fetchStory,
  };
}

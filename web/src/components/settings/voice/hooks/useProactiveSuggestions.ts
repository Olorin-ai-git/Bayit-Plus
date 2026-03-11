/**
 * useProactiveSuggestions
 * Fetches and manages proactive voice suggestions based on user preferences.
 * Suggestions are fetched only when proactive suggestions are enabled in
 * voice settings. Dismissed state persists for the current session only.
 */

import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import { useVoiceSettingsStore } from "@/stores/voiceSettingsStore";

interface ProactiveSuggestionsState {
  suggestions: string[];
  isLoading: boolean;
  isDismissed: boolean;
  dismiss: () => void;
}

export const useProactiveSuggestions = (): ProactiveSuggestionsState => {
  const preferences = useVoiceSettingsStore((state) => state.preferences);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const isEnabled =
    (preferences as unknown as Record<string, unknown>)
      .proactiveSuggestionsEnabled === true;

  useEffect(() => {
    if (!isEnabled || isDismissed) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const data = await api.get<string[]>("/voice/suggestions/proactive");
        if (!cancelled) {
          setSuggestions(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchSuggestions();

    return () => {
      cancelled = true;
    };
  }, [isEnabled, isDismissed]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  return { suggestions, isLoading, isDismissed, dismiss };
};

export default useProactiveSuggestions;

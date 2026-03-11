import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { renderIcon } from "@olorin/shared-icons/web";
import api from "@/services/api";
import { useProfileStore } from "@/stores/profileStore";
import logger from "@bayit/shared-utils/logger";

const suggestionsLogger = logger.scope("ProactiveSuggestions");

export interface ProactiveSuggestion {
  id: string;
  content_id: string;
  content_type: string;
  title: string | null;
  thumbnail_url: string | null;
  reason: string | null;
  reason_type: string;
  confidence: number;
}

interface ProactiveApiResponse {
  suggestions: ProactiveSuggestion[];
  next_poll_seconds: number;
  credits_remaining?: number;
}

interface ProactiveSuggestionsProps {
  onSelect: (suggestion: ProactiveSuggestion) => void;
}

export const ProactiveSuggestions: React.FC<ProactiveSuggestionsProps> = ({
  onSelect,
}) => {
  const { t } = useTranslation();
  const activeProfile = useProfileStore((state) => state.activeProfile);
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const clearPollTimer = () => {
    if (pollTimerRef.current !== null) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const fetchSuggestions = useCallback(async () => {
    try {
      const body: Record<string, unknown> = { platform: "web" };
      if (activeProfile?.id) {
        body.profile_id = activeProfile.id;
      }

      const data = (await api.post<ProactiveApiResponse>(
        "/voice/proactive/suggest",
        body,
      )) as ProactiveApiResponse;

      if (!mountedRef.current) return;

      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      setHasError(false);

      suggestionsLogger.debug("Proactive suggestions fetched", {
        count: data.suggestions.length,
        nextPollSeconds: data.next_poll_seconds,
        creditsRemaining: data.credits_remaining,
      });

      if (data.next_poll_seconds > 0) {
        clearPollTimer();
        pollTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            fetchSuggestions();
          }
        }, data.next_poll_seconds * 1000);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      suggestionsLogger.warn("Failed to fetch proactive suggestions", {
        error: err instanceof Error ? err.message : String(err),
      });
      setHasError(true);
      setSuggestions([]);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [activeProfile?.id]);

  useEffect(() => {
    mountedRef.current = true;
    fetchSuggestions();
    return () => {
      mountedRef.current = false;
      clearPollTimer();
    };
  }, [fetchSuggestions]);

  if (isLoading || hasError || suggestions.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {suggestions.map((s) => (
        <TouchableOpacity
          key={s.content_id}
          onPress={() => onSelect(s)}
          activeOpacity={0.7}
          style={styles.chip}
        >
          {renderIcon(s.reason_type, "sm", "secondary")}
          <Text style={styles.chipText}>
            {s.title ?? t(`voice.reasonType.${s.reason_type}`, s.reason_type)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.xs, paddingHorizontal: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipText: { fontSize: 12, color: colors.text },
});

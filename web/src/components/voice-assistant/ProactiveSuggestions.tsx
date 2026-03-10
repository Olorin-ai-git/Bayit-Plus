import React from "react";
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

export interface ProactiveSuggestion {
  id: string;
  textKey: string;
  iconName: string;
  command: string;
}

export const DEFAULT_VOICE_SUGGESTIONS: ProactiveSuggestion[] = [
  {
    id: "live",
    textKey: "voice.suggestion.watchLive",
    iconName: "playTv",
    command: "go to live",
  },
  {
    id: "search",
    textKey: "voice.suggestion.search",
    iconName: "search",
    command: "go to search",
  },
  {
    id: "radio",
    textKey: "voice.suggestion.listenRadio",
    iconName: "radio",
    command: "go to radio",
  },
];

interface ProactiveSuggestionsProps {
  suggestions: ProactiveSuggestion[];
  onSelect: (suggestion: ProactiveSuggestion) => void;
}

export const ProactiveSuggestions: React.FC<ProactiveSuggestionsProps> = ({
  suggestions,
  onSelect,
}) => {
  const { t } = useTranslation();

  if (suggestions.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {suggestions.map((s) => (
        <TouchableOpacity
          key={s.id}
          onPress={() => onSelect(s)}
          activeOpacity={0.7}
          style={styles.chip}
        >
          {renderIcon(s.iconName, "sm", "secondary")}
          <Text style={styles.chipText}>{t(s.textKey)}</Text>
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

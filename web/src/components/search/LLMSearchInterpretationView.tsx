/**
 * LLMSearchInterpretationView
 *
 * Displays the AI interpretation text and confidence score when LLM
 * search results are active. Rendered above the search results grid.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { GlassCard } from "@bayit/shared/ui";
import { colors, spacing, fontSize, borderRadius } from "@olorin/design-tokens";

interface LLMSearchInterpretationViewProps {
  interpretation: string;
  suggestions?: string[];
}

export function LLMSearchInterpretationView({
  interpretation,
  suggestions,
}: LLMSearchInterpretationViewProps) {
  const { t } = useTranslation();

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Sparkles size={16} color={colors.primary.DEFAULT} />
        <Text style={styles.label}>
          {t("search.llm.interpretationLabel", "AI Interpretation")}
        </Text>
      </View>

      <Text style={styles.interpretation}>{interpretation}</Text>

      {suggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsLabel}>
            {t("search.llm.suggestionsLabel", "Related searches")}
          </Text>
          <View style={styles.suggestionPills}>
            {suggestions.map((suggestion) => (
              <View key={suggestion} style={styles.pill}>
                <Text style={styles.pillText}>{suggestion}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.3)",
    backgroundColor: "rgba(139,92,246,0.06)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary.DEFAULT,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  interpretation: {
    fontSize: fontSize.base,
    color: colors.text,
    lineHeight: 22,
  },
  suggestionsContainer: {
    marginTop: spacing.sm,
  },
  suggestionsLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  suggestionPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: "rgba(139,92,246,0.12)",
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.2)",
  },
  pillText: {
    fontSize: fontSize.xs,
    color: colors.primary.DEFAULT,
  },
});

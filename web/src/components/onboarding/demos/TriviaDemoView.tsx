import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@bayit/shared/ui";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { DemoLayout } from "./DemoLayout";

export const TriviaDemoView: React.FC = () => {
  const { t } = useTranslation();
  return (
    <DemoLayout
      iconName="questionCircle"
      titleKey="onboarding.demo.trivia.title"
      descriptionKey="onboarding.demo.trivia.description"
    >
      <View style={styles.triviaCard}>
        <Text style={styles.question}>
          {t("onboarding.demo.trivia.question")}
        </Text>
        <View style={styles.options}>
          {["A", "B", "C"].map((letter) => (
            <GlassCard
              key={letter}
              style={[styles.option, letter === "B" && styles.optionCorrect]}
            >
              <Text
                style={[
                  styles.optionText,
                  letter === "B" && styles.optionTextCorrect,
                ]}
              >
                {t(`onboarding.demo.trivia.option${letter}`)}
              </Text>
            </GlassCard>
          ))}
        </View>
      </View>
    </DemoLayout>
  );
};

const styles = StyleSheet.create({
  triviaCard: { width: "100%", gap: spacing.sm },
  question: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  options: { gap: spacing.xs },
  option: { padding: spacing.sm },
  optionCorrect: { borderWidth: 1, borderColor: "#22c55e" },
  optionText: { fontSize: 13, color: colors.text, textAlign: "center" },
  optionTextCorrect: { color: "#22c55e", fontWeight: "600" },
});

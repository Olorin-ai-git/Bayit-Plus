import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { renderIcon } from "@olorin/shared-icons/web";
import { DemoLayout } from "./DemoLayout";

export const InteractionDemoView: React.FC = () => {
  const { t } = useTranslation();
  return (
    <DemoLayout
      iconName="personBubble"
      titleKey="onboarding.demo.interaction.title"
      descriptionKey="onboarding.demo.interaction.description"
    >
      <View style={styles.chat}>
        <View style={styles.userBubble}>
          <Text style={styles.bubbleText}>
            {t("onboarding.demo.interaction.userMsg")}
          </Text>
        </View>
        <View style={styles.aiBubble}>
          {renderIcon("brain", "sm", "discover")}
          <Text style={styles.bubbleText}>
            {t("onboarding.demo.interaction.aiMsg")}
          </Text>
        </View>
      </View>
    </DemoLayout>
  );
};

const styles = StyleSheet.create({
  chat: { width: "100%", gap: spacing.sm },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(107, 33, 168, 0.3)",
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    maxWidth: "70%",
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    maxWidth: "70%",
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "flex-start",
  },
  bubbleText: { fontSize: 12, color: colors.text, lineHeight: 16 },
});

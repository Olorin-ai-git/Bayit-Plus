import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { renderIcon } from "@olorin/shared-icons/web";
import { DemoLayout } from "./DemoLayout";

export const SubtitleDemoView: React.FC = () => {
  const { t } = useTranslation();
  return (
    <DemoLayout
      iconName="captionsBubble"
      titleKey="onboarding.demo.subtitles.title"
      descriptionKey="onboarding.demo.subtitles.description"
    >
      <View style={styles.subtitleBar}>
        <Text style={styles.subtitleText}>
          {t("onboarding.demo.subtitles.sample")}
        </Text>
        <View style={styles.highlight}>
          <Text style={styles.highlightWord}>
            {t("onboarding.demo.subtitles.word")}
          </Text>
          <View style={styles.tooltip}>
            {renderIcon("translate", "sm", "discover")}
            <Text style={styles.tooltipText}>
              {t("onboarding.demo.subtitles.translation")}
            </Text>
          </View>
        </View>
      </View>
    </DemoLayout>
  );
};

const styles = StyleSheet.create({
  subtitleBar: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  subtitleText: { fontSize: 14, color: colors.text, marginBottom: spacing.sm },
  highlight: { alignItems: "center" },
  highlightWord: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary.DEFAULT,
    textDecorationLine: "underline",
    marginBottom: spacing.xs,
  },
  tooltip: {
    flexDirection: "row",
    backgroundColor: "rgba(107, 33, 168, 0.3)",
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    gap: spacing.xs,
    alignItems: "center",
  },
  tooltipText: { fontSize: 12, color: colors.text },
});

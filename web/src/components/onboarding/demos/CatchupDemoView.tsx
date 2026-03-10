import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { renderIcon } from "@olorin/shared-icons/web";
import { DemoLayout } from "./DemoLayout";

export const CatchupDemoView: React.FC = () => {
  const { t } = useTranslation();
  return (
    <DemoLayout
      iconName="clockArrow"
      titleKey="onboarding.demo.catchup.title"
      descriptionKey="onboarding.demo.catchup.description"
    >
      <View style={styles.timeline}>
        <View style={styles.timeBlock}>
          <View style={[styles.bar, styles.barMissed]} />
          <Text style={styles.timeLabel}>
            {t("onboarding.demo.catchup.missed")}
          </Text>
        </View>
        <View style={styles.summaryBubble}>
          {renderIcon("sparkles", "sm", "discover")}
          <Text style={styles.summaryText}>
            {t("onboarding.demo.catchup.summary")}
          </Text>
        </View>
        <View style={styles.timeBlock}>
          <View style={[styles.bar, styles.barLive]} />
          <Text style={styles.timeLabel}>
            {t("onboarding.demo.catchup.live")}
          </Text>
        </View>
      </View>
    </DemoLayout>
  );
};

const styles = StyleSheet.create({
  timeline: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  timeBlock: { alignItems: "center", gap: spacing.xs },
  bar: { width: 60, height: 8, borderRadius: 4 },
  barMissed: { backgroundColor: "rgba(255,255,255,0.1)" },
  barLive: { backgroundColor: "#22c55e" },
  timeLabel: { fontSize: 10, color: colors.textSecondary },
  summaryBubble: {
    backgroundColor: "rgba(107, 33, 168, 0.2)",
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: "center",
    gap: spacing.xs,
  },
  summaryText: {
    fontSize: 10,
    color: colors.text,
    textAlign: "center",
    maxWidth: 80,
  },
});

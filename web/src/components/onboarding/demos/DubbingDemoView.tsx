import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { renderIcon } from "@olorin/shared-icons/web";
import { DemoLayout } from "./DemoLayout";

export const DubbingDemoView: React.FC = () => {
  const { t } = useTranslation();
  return (
    <DemoLayout
      iconName="waveformMic"
      titleKey="onboarding.demo.dubbing.title"
      descriptionKey="onboarding.demo.dubbing.description"
    >
      <View style={styles.columns}>
        <View style={styles.column}>
          <Text style={styles.langLabel}>
            {t("onboarding.demo.dubbing.hebrew")}
          </Text>
          <View style={styles.waveform}>
            {renderIcon("waveform", "md", "secondary")}
          </View>
        </View>
        <View style={styles.arrow}>
          {renderIcon("arrowRight", "sm", "discover")}
        </View>
        <View style={styles.column}>
          <Text style={styles.langLabel}>
            {t("onboarding.demo.dubbing.english")}
          </Text>
          <View style={styles.waveform}>
            {renderIcon("waveform", "md", "primary")}
          </View>
        </View>
      </View>
    </DemoLayout>
  );
};

const styles = StyleSheet.create({
  columns: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  column: { alignItems: "center", gap: spacing.xs },
  langLabel: { fontSize: 12, fontWeight: "600", color: colors.text },
  waveform: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  arrow: { opacity: 0.6 },
});

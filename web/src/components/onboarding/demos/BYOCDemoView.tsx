import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing } from "@olorin/design-tokens";
import { renderIcon } from "@olorin/shared-icons/web";
import { DemoLayout } from "./DemoLayout";

export const BYOCDemoView: React.FC = () => {
  const { t } = useTranslation();
  return (
    <DemoLayout
      iconName="list"
      titleKey="onboarding.demo.byoc.title"
      descriptionKey="onboarding.demo.byoc.description"
    >
      <View style={styles.flow}>
        <View style={styles.step}>
          {renderIcon("link", "sm", "secondary")}
          <Text style={styles.stepText}>{t("onboarding.demo.byoc.step1")}</Text>
        </View>
        <View style={styles.arrow}>
          {renderIcon("arrowRight", "sm", "secondary")}
        </View>
        <View style={styles.step}>
          {renderIcon("sparkles", "sm", "secondary")}
          <Text style={styles.stepText}>{t("onboarding.demo.byoc.step2")}</Text>
        </View>
        <View style={styles.arrow}>
          {renderIcon("arrowRight", "sm", "secondary")}
        </View>
        <View style={styles.step}>
          {renderIcon("playTv", "sm", "secondary")}
          <Text style={styles.stepText}>{t("onboarding.demo.byoc.step3")}</Text>
        </View>
      </View>
    </DemoLayout>
  );
};

const styles = StyleSheet.create({
  flow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  step: { alignItems: "center", gap: spacing.xs },
  stepText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 80,
  },
  arrow: { opacity: 0.4 },
});

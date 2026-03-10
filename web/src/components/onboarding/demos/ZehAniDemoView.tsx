import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { renderIcon } from "@olorin/shared-icons/web";
import { DemoLayout } from "./DemoLayout";

export const ZehAniDemoView: React.FC = () => {
  const { t } = useTranslation();
  return (
    <DemoLayout
      iconName="personCrop"
      titleKey="onboarding.demo.zehAni.title"
      descriptionKey="onboarding.demo.zehAni.description"
    >
      <View style={styles.avatarFlow}>
        <View style={styles.placeholderAvatar}>
          {renderIcon("person", "lg", "secondary")}
        </View>
        <View style={styles.arrow}>
          {renderIcon("arrowRight", "sm", "discover")}
        </View>
        <View style={styles.generatedAvatar}>
          {renderIcon("sparkles", "md", "primary")}
          <Text style={styles.label}>
            {t("onboarding.demo.zehAni.generated")}
          </Text>
        </View>
      </View>
    </DemoLayout>
  );
};

const styles = StyleSheet.create({
  avatarFlow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  placeholderAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  arrow: { opacity: 0.6 },
  generatedAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(107, 33, 168, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  label: { fontSize: 9, color: colors.text, textAlign: "center" },
});

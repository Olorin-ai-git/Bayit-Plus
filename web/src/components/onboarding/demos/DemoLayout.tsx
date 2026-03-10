import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@bayit/shared/ui";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { renderIcon } from "@olorin/shared-icons/web";
import { useDirection } from "@/hooks/useDirection";

interface DemoLayoutProps {
  iconName: string;
  titleKey: string;
  descriptionKey: string;
  children: React.ReactNode;
}

export const DemoLayout: React.FC<DemoLayoutProps> = ({
  iconName,
  titleKey,
  descriptionKey,
  children,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        {renderIcon(iconName, "lg", "discover")}
      </View>
      <Text style={[styles.title, { textAlign }]}>{t(titleKey)}</Text>
      <Text style={[styles.description, { textAlign }]}>
        {t(descriptionKey)}
      </Text>
      <GlassCard style={styles.demoArea}>{children}</GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  iconWrap: { marginBottom: spacing.md },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
    maxWidth: 400,
  },
  demoArea: {
    width: "100%",
    maxWidth: 400,
    minHeight: 200,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
});

import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing } from "@olorin/design-tokens";
import { renderIcon } from "@olorin/shared-icons/web";
import { useDirection } from "@/hooks/useDirection";
import { DiscoverFeatureCard } from "./DiscoverFeatureCard";
import type { DiscoverCategory } from "@/data/discoverTypes";
import { getFeaturesByCategory } from "@/data/discoverCatalog";

interface DiscoverCategoryRowProps {
  category: DiscoverCategory;
}

export const DiscoverCategoryRow: React.FC<DiscoverCategoryRowProps> = ({
  category,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const features = getFeaturesByCategory(category.id);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <View style={styles.categoryIcon}>
          {renderIcon(category.iconName, "sm", "secondary")}
        </View>
        <Text style={[styles.title, { textAlign }]}>{t(category.nameKey)}</Text>
        <Text style={styles.count}>
          {t("discover.featureCount", { count: features.length })}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isRTL && { flexDirection: "row-reverse" },
        ]}
      >
        {features.map((feature) => (
          <DiscoverFeatureCard key={feature.id} feature={feature} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  categoryIcon: {
    opacity: 0.7,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  count: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
  },
});

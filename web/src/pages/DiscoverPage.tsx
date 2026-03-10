import { useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassPageHeader, GlassButton } from "@bayit/shared/ui";
import { GlassLoadingSpinner } from "@bayit/shared/ui";
import { colors, spacing } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";
import { useDiscoverStore } from "@/stores/discoverStore";
import { DISCOVER_CATEGORIES } from "@/data/discoverCatalog";
import { DiscoverCategoryRow } from "@/components/discover/DiscoverCategoryRow";
import logger from "@/utils/logger";

const discoverLogger = logger.scope("DiscoverPage");

export default function DiscoverPage() {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const { isLoading, error, fetchConfig, fetchCharGenStatus } =
    useDiscoverStore();

  useEffect(() => {
    fetchConfig().catch((err: unknown) => {
      discoverLogger.error("Failed to fetch discover config", { err });
    });
    fetchCharGenStatus().catch((err: unknown) => {
      discoverLogger.error("Failed to fetch char gen status", { err });
    });
  }, [fetchConfig, fetchCharGenStatus]);

  const sortedCategories = [...DISCOVER_CATEGORIES].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <GlassLoadingSpinner size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.errorText, { textAlign }]}>{t(error)}</Text>
        <GlassButton
          title={t("common.retry")}
          onPress={() => {
            fetchConfig();
          }}
          variant="primary"
          size="sm"
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GlassPageHeader
        title={t("nav.discoverHub")}
        subtitle={t("discover.subtitle")}
      />
      <Text style={[styles.description, { textAlign }]}>
        {t("discover.description")}
      </Text>
      {sortedCategories.map((category) => (
        <DiscoverCategoryRow key={category.id} category={category} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginBottom: spacing.sm,
  },
});

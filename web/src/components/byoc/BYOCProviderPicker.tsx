import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@bayit/shared/ui";
import { GlassLoadingSpinner } from "@bayit/shared/ui";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";
import { byocService } from "@/services/api";
import logger from "@bayit/shared-utils/logger";

const providerLogger = logger.scope("BYOCProviderPicker");

interface Provider {
  id: string;
  name: string;
  logo_url: string;
  type: string;
  setup_url: string;
}

interface BYOCProviderPickerProps {
  onSelect: (provider: Provider) => void;
}

export const BYOCProviderPicker: React.FC<BYOCProviderPickerProps> = ({
  onSelect,
}) => {
  const { t } = useTranslation();
  const { textAlign, isRTL } = useDirection();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await byocService.getProviders();
        setProviders(data.providers);
      } catch (err) {
        providerLogger.error("Failed to load providers", { err });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <GlassLoadingSpinner size="small" />
      </View>
    );
  }

  if (providers.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { textAlign }]}>
        {t("byoc.providers.title")}
      </Text>
      <View style={[styles.grid, isRTL && { flexDirection: "row-reverse" }]}>
        {providers.map((provider) => (
          <TouchableOpacity
            key={provider.id}
            onPress={() => onSelect(provider)}
            activeOpacity={0.8}
          >
            <GlassCard style={styles.providerCard}>
              {provider.logo_url ? (
                <Image
                  source={{ uri: provider.logo_url }}
                  style={styles.logo}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoText}>{provider.name.charAt(0)}</Text>
                </View>
              )}
              <Text
                style={[styles.providerName, { textAlign }]}
                numberOfLines={1}
              >
                {provider.name}
              </Text>
            </GlassCard>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  centered: { padding: spacing.lg, alignItems: "center" },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  providerCard: { width: 100, padding: spacing.sm, alignItems: "center" },
  logo: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: "rgba(107, 33, 168, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  logoText: { fontSize: 20, fontWeight: "700", color: colors.primary.DEFAULT },
  providerName: { fontSize: 12, color: colors.textSecondary },
});

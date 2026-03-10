import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import type { FeatureAvailability } from "@/data/discoverTypes";

interface DiscoverAvailabilityBadgeProps {
  availability: FeatureAvailability;
}

const STATE_STYLES: Record<
  FeatureAvailability["state"],
  { bgColor: string; textColor: string; labelKey: string }
> = {
  ready: {
    bgColor: "rgba(34, 197, 94, 0.2)",
    textColor: "#22c55e",
    labelKey: "discover.availability.ready",
  },
  setupNeeded: {
    bgColor: "rgba(234, 179, 8, 0.2)",
    textColor: "#eab308",
    labelKey: "discover.availability.setupNeeded",
  },
  premiumRequired: {
    bgColor: "rgba(168, 85, 247, 0.2)",
    textColor: colors.primary.DEFAULT,
    labelKey: "discover.availability.premiumRequired",
  },
  notAvailable: {
    bgColor: "rgba(107, 114, 128, 0.2)",
    textColor: colors.textSecondary,
    labelKey: "discover.availability.notAvailable",
  },
  platformOnly: {
    bgColor: "rgba(59, 130, 246, 0.2)",
    textColor: "#3b82f6",
    labelKey: "discover.availability.platformOnly",
  },
};

export const DiscoverAvailabilityBadge: React.FC<
  DiscoverAvailabilityBadgeProps
> = ({ availability }) => {
  const { t } = useTranslation();
  const style = STATE_STYLES[availability.state];

  return (
    <View style={[styles.badge, { backgroundColor: style.bgColor }]}>
      <Text style={[styles.text, { color: style.textColor }]}>
        {t(style.labelKey)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
  },
});

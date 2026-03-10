import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "@bayit/shared/ui";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { renderIcon } from "@olorin/shared-icons/web";
import { useDirection } from "@/hooks/useDirection";
import { useDiscoverStore } from "@/stores/discoverStore";
import { DiscoverAvailabilityBadge } from "./DiscoverAvailabilityBadge";
import type { DiscoverFeature } from "@/data/discoverTypes";

interface DiscoverFeatureCardProps {
  feature: DiscoverFeature;
}

export const DiscoverFeatureCard: React.FC<DiscoverFeatureCardProps> = ({
  feature,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isRTL, textAlign } = useDirection();
  const getAvailability = useDiscoverStore((s) => s.getAvailability);
  const availability = getAvailability(feature.id);

  const handlePress = () => {
    navigate(`/discover/${feature.id}`);
  };

  const platformIcons = feature.platforms.map((p) => {
    const iconMap: Record<string, string> = {
      web: "globe",
      ios: "phone",
      tvos: "tv",
    };
    return iconMap[p] ?? "globe";
  });

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <GlassCard style={styles.card}>
        <View
          style={[
            styles.header,
            { flexDirection: isRTL ? "row-reverse" : "row" },
          ]}
        >
          <View style={styles.iconWrap}>
            {renderIcon(feature.iconName, "md", "discover")}
          </View>
          <View style={styles.platformIcons}>
            {platformIcons.map((icon, i) => (
              <View key={i} style={styles.platformIcon}>
                {renderIcon(icon, "sm", "secondary")}
              </View>
            ))}
          </View>
        </View>
        <Text style={[styles.name, { textAlign }]} numberOfLines={1}>
          {t(feature.nameKey)}
        </Text>
        <Text style={[styles.tagline, { textAlign }]} numberOfLines={2}>
          {t(feature.taglineKey)}
        </Text>
        <DiscoverAvailabilityBadge availability={availability} />
      </GlassCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 180,
    padding: spacing.md,
    marginEnd: spacing.sm,
  },
  header: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: "rgba(107, 33, 168, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  platformIcons: {
    flexDirection: "row",
    gap: 4,
  },
  platformIcon: {
    opacity: 0.6,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
});

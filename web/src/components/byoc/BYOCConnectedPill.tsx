import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Play, Wifi, Monitor, ChevronRight } from "lucide-react";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";
import type { BYOCSource, SourceType } from "@/stores/byocStore";

const TYPE_ICONS: Record<SourceType, React.ElementType> = {
  youtube: Play,
  iptv: Wifi,
  xtream: Monitor,
  plex: ChevronRight,
};

const TYPE_COLORS: Record<SourceType, { icon: string; bg: string }> = {
  youtube: { icon: "#ffffff", bg: "#cc0000" },
  iptv: { icon: "#c084fc", bg: "rgba(126, 34, 206, 0.25)" },
  xtream: { icon: "#c084fc", bg: "rgba(126, 34, 206, 0.25)" },
  plex: { icon: "#e5a00d", bg: "rgba(30, 30, 30, 0.9)" },
};

interface BYOCConnectedPillProps {
  source: BYOCSource;
}

export const BYOCConnectedPill: React.FC<BYOCConnectedPillProps> = ({
  source,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const IconComponent = TYPE_ICONS[source.type];
  const typeColor = TYPE_COLORS[source.type];

  return (
    <View style={styles.pill}>
      <View
        style={[styles.inner, { flexDirection: isRTL ? "row-reverse" : "row" }]}
      >
        <View style={[styles.iconCircle, { backgroundColor: typeColor.bg }]}>
          <IconComponent
            size={14}
            color={typeColor.icon}
            fill={source.type === "youtube" ? typeColor.icon : "none"}
            strokeWidth={source.type === "youtube" ? 0 : 2}
          />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {source.name}
        </Text>
        <Text style={styles.dash}>-</Text>
        <Text style={styles.connected}>{t("byoc.plex.connected")}</Text>
        <View style={styles.statusDot} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    backgroundColor: "rgba(30, 30, 40, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(126, 34, 206, 0.2)",
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inner: {
    alignItems: "center",
    gap: spacing.sm,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    maxWidth: 160,
  },
  dash: {
    fontSize: 14,
    color: colors.textMuted,
  },
  connected: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.success.DEFAULT,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success.DEFAULT,
  },
});

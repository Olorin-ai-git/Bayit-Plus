import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Play, Wifi, Monitor, ChevronRight } from "lucide-react";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";
import type { SourceType } from "@/stores/byocStore";

interface SourceTypeConfig {
  Icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  borderGlow: string;
}

const SOURCE_CONFIG: Record<SourceType, SourceTypeConfig> = {
  youtube: {
    Icon: Play,
    iconColor: "#ffffff",
    bgColor: "#cc0000",
    borderGlow: "rgba(204, 0, 0, 0.3)",
  },
  iptv: {
    Icon: Wifi,
    iconColor: "#c084fc",
    bgColor: "rgba(126, 34, 206, 0.25)",
    borderGlow: "rgba(126, 34, 206, 0.3)",
  },
  xtream: {
    Icon: Monitor,
    iconColor: "#c084fc",
    bgColor: "rgba(126, 34, 206, 0.25)",
    borderGlow: "rgba(126, 34, 206, 0.3)",
  },
  plex: {
    Icon: ChevronRight,
    iconColor: "#e5a00d",
    bgColor: "rgba(30, 30, 30, 0.9)",
    borderGlow: "rgba(229, 160, 13, 0.3)",
  },
};

interface BYOCSourceTypeCardProps {
  type: SourceType;
  title: string;
  description: string;
  onAdd: () => void;
}

export const BYOCSourceTypeCard: React.FC<BYOCSourceTypeCardProps> = ({
  type,
  title,
  description,
  onAdd,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const config = SOURCE_CONFIG[type];

  return (
    <TouchableOpacity
      onPress={onAdd}
      activeOpacity={0.85}
      style={styles.cardTouchable}
    >
      <View style={styles.card}>
        <View
          style={[
            styles.cardInner,
            { flexDirection: isRTL ? "row-reverse" : "row" },
          ]}
        >
          <View
            style={[styles.iconCircle, { backgroundColor: config.bgColor }]}
          >
            <config.Icon
              size={28}
              color={config.iconColor}
              fill={type === "youtube" ? config.iconColor : "none"}
              strokeWidth={type === "youtube" ? 0 : 2}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {description}
            </Text>
            <View
              style={[
                styles.addButton,
                { alignSelf: isRTL ? "flex-end" : "flex-start" },
              ]}
            >
              <Text style={styles.addPlus}>+</Text>
              <Text style={styles.addText}>{t("byoc.addButton")}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const CARD_WIDTH = 380;

const styles = StyleSheet.create({
  cardTouchable: {
    width: CARD_WIDTH,
    flexShrink: 1,
    flexGrow: 0,
    minWidth: 300,
  },
  card: {
    backgroundColor: "rgba(30, 30, 40, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  cardInner: {
    alignItems: "center",
    gap: spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.xs,
  },
  addPlus: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.success.DEFAULT,
  },
  addText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.success.DEFAULT,
  },
});

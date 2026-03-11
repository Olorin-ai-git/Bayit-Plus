/**
 * ChannelChatHeader Component
 * Header bar for the channel chat panel with title, participant count,
 * translation badge, and close button.
 */

import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { MessageCircle, Users, X } from "lucide-react";

interface ChannelChatHeaderProps {
  userCount: number;
  translationEnabled: boolean;
  onClose: () => void;
}

export default function ChannelChatHeader({
  userCount,
  translationEnabled,
  onClose,
}: ChannelChatHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <MessageCircle size={16} color={colors.primary.DEFAULT} />
        <Text style={styles.title}>{t("channelChat.title")}</Text>
      </View>
      <View style={styles.metaRow}>
        <Users size={12} color={colors.textSecondary} />
        <Text style={styles.userCount}>
          {t("channelChat.participants", { count: userCount })}
        </Text>
        {translationEnabled && (
          <View style={styles.betaBadge}>
            <Text style={styles.betaBadgeText}>
              {t("channelChat.autoTranslationBadge")}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.actions}>
        <Pressable onPress={onClose} accessibilityRole="button">
          <X size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderLight,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
    marginLeft: spacing.sm,
  },
  userCount: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  betaBadge: {
    backgroundColor: colors.glassPurpleLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  betaBadgeText: {
    color: colors.primary[300],
    fontSize: 10,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});

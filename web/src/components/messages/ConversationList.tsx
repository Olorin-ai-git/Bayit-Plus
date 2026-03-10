import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@bayit/shared/ui";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { renderIcon } from "@olorin/shared-icons/web";
import { useDirection } from "@/hooks/useDirection";
import type { ConversationSummary } from "@/stores/dmStore";

interface ConversationListProps {
  conversations: ConversationSummary[];
  onSelect: (friendId: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  onSelect,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { textAlign }]}>{t("dm.conversations")}</Text>
      {conversations.map((conv) => {
        const timeStr = conv.last_message_at
          ? new Date(conv.last_message_at).toLocaleDateString([], {
              month: "short",
              day: "numeric",
            })
          : "";

        return (
          <TouchableOpacity
            key={conv.friend_id}
            onPress={() => onSelect(conv.friend_id)}
          >
            <GlassCard style={styles.card}>
              <View
                style={[
                  styles.row,
                  { flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
              >
                <View style={styles.avatar}>
                  {renderIcon("person", "sm", "secondary")}
                </View>
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {conv.friend_name}
                    </Text>
                    <Text style={styles.time}>{timeStr}</Text>
                  </View>
                  {conv.last_message && (
                    <Text style={styles.preview} numberOfLines={1}>
                      {conv.last_message}
                    </Text>
                  )}
                </View>
                {conv.unread_count > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{conv.unread_count}</Text>
                  </View>
                )}
              </View>
            </GlassCard>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    paddingHorizontal: spacing.md,
  },
  card: { padding: spacing.sm, marginHorizontal: spacing.md },
  row: { alignItems: "center", gap: spacing.sm },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  info: { flex: 1 },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontSize: 14, fontWeight: "600", color: colors.text, flex: 1 },
  time: { fontSize: 11, color: colors.textSecondary },
  preview: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  badge: {
    backgroundColor: colors.primary.DEFAULT,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.text },
});

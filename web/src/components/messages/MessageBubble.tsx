import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassButton } from "@bayit/shared/ui";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";
import { useAuthStore } from "@bayit/shared-stores/authStore";
import type { DMMessage } from "@/stores/dmStore";

const REACTION_EMOJIS = ["like", "love", "laugh", "surprise", "sad"];

interface MessageBubbleProps {
  message: DMMessage;
  onTranslate: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onTranslate,
  onReact,
  onRemoveReaction,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const user = useAuthStore((s) => s.user);
  const isMine = message.sender_id === user?.uid;
  const [showReactions, setShowReactions] = useState(false);

  const timeStr = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const reactionEntries = Object.entries(message.reactions || {});

  return (
    <View
      style={[
        styles.container,
        isMine ? styles.myMessage : styles.theirMessage,
        { flexDirection: isRTL ? "row-reverse" : "row" },
      ]}
    >
      <View
        style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}
      >
        {!isMine && (
          <Text style={styles.senderName}>{message.sender_name}</Text>
        )}
        <Text style={[styles.messageText, isMine && styles.myText]}>
          {message.message}
        </Text>
        {message.translated_text && (
          <Text style={styles.translatedText}>{message.translated_text}</Text>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.timeText}>{timeStr}</Text>
          {isMine && (
            <Text style={styles.readReceipt}>
              {message.read ? t("dm.read") : t("dm.sent")}
            </Text>
          )}
        </View>

        {reactionEntries.length > 0 && (
          <View style={styles.reactionsRow}>
            {reactionEntries.map(([emoji, users]) => (
              <GlassButton
                key={emoji}
                title={`${t(`dm.reaction.${emoji}`)} ${users.length}`}
                onPress={() =>
                  users.includes(user?.uid || "")
                    ? onRemoveReaction(message.id, emoji)
                    : onReact(message.id, emoji)
                }
                variant="ghost"
                size="sm"
              />
            ))}
          </View>
        )}

        <View style={styles.actions}>
          {!message.translated_text && (
            <GlassButton
              title={t("dm.translate")}
              onPress={() => onTranslate(message.id)}
              variant="ghost"
              size="sm"
            />
          )}
          <GlassButton
            title={t("dm.react")}
            onPress={() => setShowReactions(!showReactions)}
            variant="ghost"
            size="sm"
          />
        </View>

        {showReactions && (
          <View style={styles.reactionPicker}>
            {REACTION_EMOJIS.map((emoji) => (
              <GlassButton
                key={emoji}
                title={t(`dm.reaction.${emoji}`)}
                onPress={() => {
                  onReact(message.id, emoji);
                  setShowReactions(false);
                }}
                variant="ghost"
                size="sm"
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: spacing.sm, paddingHorizontal: spacing.md },
  myMessage: { justifyContent: "flex-end" },
  theirMessage: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "75%",
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  myBubble: { backgroundColor: "rgba(59, 130, 246, 0.3)" },
  theirBubble: { backgroundColor: "rgba(255, 255, 255, 0.1)" },
  senderName: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary.DEFAULT,
    marginBottom: 2,
  },
  messageText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  myText: { color: colors.text },
  translatedText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.xs,
    marginTop: 2,
  },
  timeText: { fontSize: 10, color: colors.textSecondary },
  readReceipt: { fontSize: 10, color: colors.textSecondary },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: spacing.xs,
  },
  actions: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs },
  reactionPicker: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: "wrap",
  },
});

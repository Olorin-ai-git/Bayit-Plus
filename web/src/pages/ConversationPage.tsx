import { useEffect, useRef, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  GlassPageHeader,
  GlassLoadingSpinner,
  GlassButton,
} from "@bayit/shared/ui";
import { colors, spacing } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";
import { useDMStore } from "@/stores/dmStore";
import { MessageBubble } from "@/components/messages/MessageBubble";
import { MessageInput } from "@/components/messages/MessageInput";

export default function ConversationPage() {
  const { friendId } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scrollRef = useRef<any>(null);

  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    conversations,
    fetchMessages,
    loadMoreMessages,
    sendMessage,
    markAllRead,
    translateMessage,
    addReaction,
    removeReaction,
    connectWebSocket,
    disconnectWebSocket,
  } = useDMStore();

  const friend = conversations.find((c) => c.friend_id === friendId);
  const friendName = friend?.friend_name || t("dm.conversation");

  useEffect(() => {
    if (friendId) {
      fetchMessages(friendId);
      connectWebSocket(friendId);
      markAllRead(friendId);
    }
    return () => {
      disconnectWebSocket();
    };
  }, [
    friendId,
    fetchMessages,
    connectWebSocket,
    disconnectWebSocket,
    markAllRead,
  ]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const handleSend = useCallback(
    (text: string) => {
      if (friendId) {
        sendMessage(friendId, text);
      }
    },
    [friendId, sendMessage],
  );

  if (isLoading && messages.length === 0) {
    return (
      <View style={styles.centered}>
        <GlassLoadingSpinner size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GlassPageHeader
        title={friendName}
        onBack={() => navigate("/messages")}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
      >
        {hasMore && (
          <View style={styles.loadMore}>
            {isLoadingMore ? (
              <GlassLoadingSpinner size="small" />
            ) : (
              <GlassButton
                title={t("dm.loadMore")}
                onPress={loadMoreMessages}
                variant="ghost"
                size="sm"
              />
            )}
          </View>
        )}

        {messages.length === 0 && (
          <Text style={[styles.emptyHint, { textAlign }]}>
            {t("dm.startConversation")}
          </Text>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onTranslate={translateMessage}
            onReact={addReaction}
            onRemoveReaction={removeReaction}
          />
        ))}
      </ScrollView>

      <MessageInput onSend={handleSend} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageList: { flex: 1 },
  messageContent: { paddingVertical: spacing.md },
  loadMore: { alignItems: "center", marginBottom: spacing.md },
  emptyHint: {
    fontSize: 14,
    color: colors.textSecondary,
    padding: spacing.xl,
  },
});

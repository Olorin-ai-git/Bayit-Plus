import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  message_type: string;
  created_at: string;
}

interface WatchPartyChatProps {
  messages: ChatMessage[];
  currentUserId: string;
  maxHeight?: number;
}

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
};

const ChatMessage: React.FC<{
  message: ChatMessage;
  isOwnMessage: boolean;
}> = ({ message, isOwnMessage }) => {
  const isEmoji = message.message_type === 'emoji';
  const isSystem = message.message_type === 'system';

  if (isSystem) {
    return (
      <View style={styles.systemMessage}>
        <Text style={styles.systemText}>{message.content}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage,
      ]}
    >
      <GlassView
        style={[
          styles.messageBubble,
          isEmoji && styles.emojiBubble,
          isOwnMessage && styles.ownBubble,
        ]}
        intensity="low"
        noBorder={isEmoji}
      >
        {!isOwnMessage && !isEmoji && (
          <Text style={styles.senderName}>{message.user_name}</Text>
        )}
        <Text style={[styles.messageText, isEmoji && styles.emojiText]}>
          {message.content}
        </Text>
        {!isEmoji && (
          <Text style={styles.timestamp}>{formatTime(message.created_at)}</Text>
        )}
      </GlassView>
    </View>
  );
};

export const WatchPartyChat: React.FC<WatchPartyChatProps> = ({
  messages,
  currentUserId,
  maxHeight = 300,
}) => {
  const { t } = useTranslation();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('watchParty.chat')}</Text>
      <ScrollView
        ref={scrollViewRef}
        style={[styles.messageList, { maxHeight }]}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <Text style={styles.emptyText}>{t('watchParty.typeMessage')}</Text>
        ) : (
          messages.map((msg, idx) => (
            <ChatMessage
              key={msg.id || idx}
              message={msg}
              isOwnMessage={msg.user_id === currentUserId}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  messageList: {
    flexGrow: 0,
  },
  messageContainer: {
    marginBottom: spacing.xs,
    flexDirection: 'row',
  },
  ownMessage: {
    justifyContent: 'flex-start',
  },
  otherMessage: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  ownBubble: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  emojiBubble: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.xs,
  },
  senderName: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.primary,
    marginBottom: 2,
  },
  messageText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  emojiText: {
    fontSize: 28,
    lineHeight: 36,
  },
  timestamp: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  systemText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    backgroundColor: colors.glassBorder,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSize.sm,
    paddingVertical: spacing.xl,
  },
});

export default WatchPartyChat;

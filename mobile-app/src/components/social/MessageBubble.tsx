/**
 * MessageBubble - Chat message bubble component for DM conversations.
 *
 * Sent messages appear right-aligned with primary color background.
 * Received messages appear left-aligned with glass background.
 * Displays timestamp and read receipt indicator.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, borderRadius } from '@olorin/design-tokens';
import Colors from '../../theme/colors';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: string;
  isRead: boolean;
}

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
}

function formatMessageTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMine,
}) => {
  const timeLabel = formatMessageTime(message.timestamp);

  return (
    <View
      style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${isMine ? 'You' : 'Them'}: ${message.text}, ${timeLabel}`}
      accessibilityHint={
        isMine && message.isRead
          ? 'Message has been read'
          : isMine
            ? 'Message not yet read'
            : undefined
      }
    >
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isMine ? styles.textMine : styles.textTheirs,
          ]}
        >
          {message.text}
        </Text>
      </View>
      <View style={[styles.metaRow, isMine && styles.metaRowMine]}>
        <Text style={styles.timeText}>{timeLabel}</Text>
        {isMine && (
          <Text style={styles.readReceipt}>
            {message.isRead ? '\u2713\u2713' : '\u2713'}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.xs,
    maxWidth: '78%',
  },
  rowMine: {
    alignSelf: 'flex-end',
  },
  rowTheirs: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  bubbleMine: {
    backgroundColor: Colors.Primary.p700,
    borderBottomRightRadius: borderRadius.xs,
  },
  bubbleTheirs: {
    backgroundColor: Colors.Glass.bgMedium,
    borderBottomLeftRadius: borderRadius.xs,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  textMine: {
    color: Colors.Text.primary,
  },
  textTheirs: {
    color: Colors.Text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
    paddingHorizontal: spacing.xs,
  },
  metaRowMine: {
    justifyContent: 'flex-end',
  },
  timeText: {
    fontSize: 11,
    color: Colors.Text.disabled,
  },
  readReceipt: {
    fontSize: 11,
    color: Colors.Primary.p400,
  },
});

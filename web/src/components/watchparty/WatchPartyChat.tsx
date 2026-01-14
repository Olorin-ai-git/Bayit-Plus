import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import WatchPartyChatInput from './WatchPartyChatInput'

interface Message {
  id?: string
  user_id: string
  user_name: string
  content: string
  message_type?: 'text' | 'emoji' | 'system'
  created_at: string
}

interface WatchPartyChatProps {
  messages: Message[]
  currentUserId: string
  onSendMessage: (message: string, type?: string) => void
  chatEnabled: boolean
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

function ChatMessage({ message, isOwnMessage }: { message: Message; isOwnMessage: boolean }) {
  const isEmoji = message.message_type === 'emoji'
  const isSystem = message.message_type === 'system'

  if (isSystem) {
    return (
      <View style={styles.systemMessage}>
        <Text style={styles.systemText}>{message.content}</Text>
      </View>
    )
  }

  return (
    <View style={[styles.messageRow, isOwnMessage && styles.messageRowOwn]}>
      <View
        style={[
          styles.messageBubble,
          isEmoji
            ? styles.emojiBubble
            : isOwnMessage
              ? styles.ownBubble
              : styles.otherBubble,
        ]}
      >
        {!isOwnMessage && !isEmoji && (
          <Text style={styles.senderName}>{message.user_name}</Text>
        )}
        <Text style={[styles.messageText, isEmoji && styles.emojiText]}>
          {message.content}
        </Text>
        {!isEmoji && (
          <Text style={[styles.timestamp, isOwnMessage && styles.timestampOwn]}>
            {formatTime(message.created_at)}
          </Text>
        )}
      </View>
    </View>
  )
}

export default function WatchPartyChat({
  messages,
  currentUserId,
  onSendMessage,
  chatEnabled,
}: WatchPartyChatProps) {
  const { t } = useTranslation()
  const scrollViewRef = useRef<ScrollView>(null)

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true })
  }, [messages])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('watchParty.chat')}</Text>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('watchParty.typeMessage')}</Text>
          </View>
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

      <View style={styles.inputContainer}>
        <WatchPartyChatInput
          onSend={onSendMessage}
          disabled={!chatEnabled}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  messagesList: {
    flex: 1,
    minHeight: 0,
  },
  messagesContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowOwn: {
    flexDirection: 'row-reverse',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  emojiBubble: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  ownBubble: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  otherBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    color: colors.text,
  },
  emojiText: {
    fontSize: 28,
  },
  timestamp: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing.xs,
    opacity: 0,
  },
  timestampOwn: {
    color: 'rgba(168, 85, 247, 0.6)',
  },
  systemMessage: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  systemText: {
    fontSize: 12,
    color: colors.textMuted,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  inputContainer: {
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
})

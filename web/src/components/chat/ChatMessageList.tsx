import { useRef, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { ChatRecommendations } from './ChatRecommendations'
import type { Message } from './types'

declare const __TV__: boolean
const IS_TV = typeof __TV__ !== 'undefined' && __TV__

interface ChatMessageListProps {
  messages: Message[]
  isLoading?: boolean
  isRTL?: boolean
  onRecommendationPress?: (id: string) => void
}

export function ChatMessageList({
  messages,
  isLoading = false,
  isRTL = false,
  onRecommendationPress,
}: ChatMessageListProps) {
  const messagesEndRef = useRef<ScrollView>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollToEnd({ animated: true })
  }, [messages])

  return (
    <ScrollView
      ref={messagesEndRef}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {messages.map((message, index) => (
        <View
          key={index}
          style={[
            styles.messageRow,
            message.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant,
          ]}
        >
          {message.type === 'recommendations' ? (
            <ChatRecommendations
              recommendations={Array.isArray(message.content) ? message.content : []}
              isRTL={isRTL}
              onRecommendationPress={onRecommendationPress}
            />
          ) : (
            <View
              style={[
                styles.messageBubble,
                message.role === 'user' && styles.messageBubbleUser,
                message.role === 'assistant' && !message.isError && styles.messageBubbleAssistant,
                message.isError && styles.messageBubbleError,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.isError && styles.messageTextError,
                ]}
              >
                {typeof message.content === 'string' ? message.content : ''}
              </Text>
            </View>
          )}
        </View>
      ))}

      {isLoading && (
        <View style={[styles.messageRow, styles.messageRowAssistant]}>
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  messageRow: {
    marginBottom: spacing.sm,
  },
  messageRowUser: {
    alignItems: 'flex-start',
  },
  messageRowAssistant: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: IS_TV ? spacing.lg : spacing.md,
    paddingVertical: IS_TV ? spacing.md : spacing.sm + 2,
    borderRadius: borderRadius.lg,
  },
  messageBubbleUser: {
    backgroundColor: colors.primary,
    borderTopRightRadius: borderRadius.sm,
  },
  messageBubbleAssistant: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: borderRadius.sm,
  },
  messageBubbleError: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderTopLeftRadius: borderRadius.sm,
  },
  messageText: {
    fontSize: IS_TV ? 22 : 14,
    color: colors.text,
    lineHeight: IS_TV ? 32 : 20,
  },
  messageTextError: {
    color: colors.error,
  },
  loadingBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderTopLeftRadius: borderRadius.sm,
  },
})

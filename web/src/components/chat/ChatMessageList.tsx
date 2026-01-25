import { useRef, useEffect } from 'react'
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
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
      className="flex-1"
      contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
    >
      {messages.map((message, index) => (
        <View
          key={index}
          className="mb-2"
          style={[message.role === 'user' ? styles.alignStart : styles.alignEnd]}
        >
          {message.type === 'recommendations' ? (
            <ChatRecommendations
              recommendations={Array.isArray(message.content) ? message.content : []}
              isRTL={isRTL}
              onRecommendationPress={onRecommendationPress}
            />
          ) : (
            <View
              className="max-w-[80%] rounded-lg"
              style={[
                IS_TV ? styles.paddingTV : styles.paddingMobile,
                message.role === 'user'
                  ? styles.bgUser
                  : message.isError
                  ? styles.bgError
                  : styles.bgAssistant,
              ]}
            >
              <Text
                style={[
                  IS_TV ? styles.textTV : styles.textMobile,
                  message.isError ? styles.textError : styles.textWhite,
                ]}
              >
                {typeof message.content === 'string' ? message.content : ''}
              </Text>
            </View>
          )}
        </View>
      ))}

      {isLoading && (
        <View className="mb-2 items-end">
          <View className="bg-white/10 px-4 py-2 rounded-lg rounded-tl-sm">
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  alignStart: {
    alignItems: 'flex-start',
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  paddingTV: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  paddingMobile: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bgUser: {
    backgroundColor: '#8a2be2',
    borderTopRightRadius: 2,
  },
  bgError: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderTopLeftRadius: 2,
  },
  bgAssistant: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: 2,
  },
  textTV: {
    fontSize: 22,
    lineHeight: 32,
  },
  textMobile: {
    fontSize: 14,
    lineHeight: 20,
  },
  textError: {
    color: '#ef4444',
  },
  textWhite: {
    color: '#fff',
  },
})

import { useRef, useEffect } from 'react'
import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
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
      className="flex-1"
      contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
    >
      {messages.map((message, index) => (
        <View
          key={index}
          className={\`mb-2 \${message.role === 'user' ? 'items-start' : 'items-end'}\`}
        >
          {message.type === 'recommendations' ? (
            <ChatRecommendations
              recommendations={Array.isArray(message.content) ? message.content : []}
              isRTL={isRTL}
              onRecommendationPress={onRecommendationPress}
            />
          ) : (
            <View
              className={\`max-w-[80%] \${IS_TV ? 'px-6 py-4' : 'px-4 py-2'} rounded-lg \${
                message.role === 'user'
                  ? 'bg-[#8a2be2] rounded-tr-sm'
                  : message.isError
                  ? 'bg-[rgba(239,68,68,0.2)] rounded-tl-sm'
                  : 'bg-white/10 rounded-tl-sm'
              }\`}
            >
              <Text
                className={\`\${IS_TV ? 'text-[22px] leading-8' : 'text-sm leading-5'} \${
                  message.isError ? 'text-[#ef4444]' : 'text-white'
                }\`}
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

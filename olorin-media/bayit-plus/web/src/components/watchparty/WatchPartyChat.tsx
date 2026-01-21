import { useEffect, useRef } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '@bayit/shared/theme'
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
      <View className="items-center py-2">
        <Text className="text-xs text-gray-400 bg-white/5 px-4 py-2 rounded-full">{message.content}</Text>
      </View>
    )
  }

  const bubbleClass = isEmoji
    ? 'bg-transparent px-0 py-0'
    : isOwnMessage
      ? 'bg-purple-700/30'
      : 'bg-white/10'

  return (
    <View className={`flex-row ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      <View className={`max-w-[80%] rounded-2xl px-4 py-3 ${bubbleClass}`}>
        {!isOwnMessage && !isEmoji && (
          <Text className="text-xs font-medium text-purple-400 mb-0.5">{message.user_name}</Text>
        )}
        <Text className={`${isEmoji ? 'text-3xl' : 'text-sm text-white'}`}>
          {message.content}
        </Text>
        {!isEmoji && (
          <Text className={`text-[10px] mt-2 opacity-0 ${isOwnMessage ? 'text-purple-400/60' : 'text-gray-400'}`}>
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
    <View className="flex-1">
      <Text className="text-sm font-medium text-gray-400 px-2 mb-3">{t('watchParty.chat')}</Text>

      <ScrollView
        ref={scrollViewRef}
        className="flex-1 min-h-0"
        contentContainerClassName="gap-3 px-2"
      >
        {messages.length === 0 ? (
          <View className="items-center py-16">
            <Text className="text-sm text-gray-400">{t('watchParty.typeMessage')}</Text>
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

      <View className="pt-4 mt-3 border-t border-white/10">
        <WatchPartyChatInput
          onSend={onSendMessage}
          disabled={!chatEnabled}
        />
      </View>
    </View>
  )
}

import { useEffect, useRef } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
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

  const getBubbleStyle = () => {
    if (isEmoji) return styles.bubbleEmoji
    return isOwnMessage ? styles.bubbleOwn : styles.bubbleOther
  }

  return (
    <View className="flex-row" style={[isOwnMessage && styles.rowReverse]}>
      <View className="max-w-[80%] rounded-2xl px-4 py-3" style={[getBubbleStyle()]}>
        {!isOwnMessage && !isEmoji && (
          <Text className="text-xs font-medium text-purple-400 mb-0.5">{message.user_name}</Text>
        )}
        <Text style={[isEmoji ? styles.textEmoji : styles.textNormal]}>
          {message.content}
        </Text>
        {!isEmoji && (
          <Text className="text-[10px] mt-2 opacity-0" style={[isOwnMessage ? styles.timeOwn : styles.timeOther]}>
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

const styles = StyleSheet.create({
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  bubbleEmoji: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  bubbleOwn: {
    backgroundColor: 'rgba(109, 40, 217, 0.3)',
  },
  bubbleOther: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  textEmoji: {
    fontSize: 30,
  },
  textNormal: {
    fontSize: 14,
    color: '#fff',
  },
  timeOwn: {
    color: 'rgba(192, 132, 252, 0.6)',
  },
  timeOther: {
    color: '#9ca3af',
  },
})

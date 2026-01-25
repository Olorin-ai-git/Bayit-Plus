/**
 * WatchPartyChat Component
 * Chat interface for Watch Party with message bubbles
 */

import { useEffect, useRef } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import WatchPartyChatInput from './WatchPartyChatInput'
import { sanitizeChatMessage, sanitizeUsername } from './chatSanitizer'
import { styles } from './WatchPartyChat.styles'

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
  isPanelOpen?: boolean
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

function ChatMessage({ message, isOwnMessage }: { message: Message; isOwnMessage: boolean }) {
  const isEmoji = message.message_type === 'emoji'
  const isSystem = message.message_type === 'system'

  // Sanitize content and username
  const sanitizedContent = isEmoji ? message.content : sanitizeChatMessage(message.content)
  const sanitizedUsername = sanitizeUsername(message.user_name)

  if (isSystem) {
    return (
      <View style={styles.systemMessageContainer}>
        <Text style={styles.systemMessageText}>{sanitizedContent}</Text>
      </View>
    )
  }

  const getBubbleStyle = () => {
    if (isEmoji) return [styles.bubble, styles.bubbleEmoji]
    return [styles.bubble, isOwnMessage ? styles.bubbleOwn : styles.bubbleOther]
  }

  return (
    <View style={isOwnMessage ? styles.messageRowReverse : styles.messageRow}>
      <View style={getBubbleStyle()}>
        {!isOwnMessage && !isEmoji && (
          <Text style={styles.userName}>{sanitizedUsername}</Text>
        )}
        <Text style={isEmoji ? styles.textEmoji : styles.textNormal}>
          {sanitizedContent}
        </Text>
        {!isEmoji && (
          <Text style={[styles.timestamp, isOwnMessage ? styles.timestampOwn : styles.timestampOther]}>
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
  isPanelOpen = false,
}: WatchPartyChatProps) {
  const { t } = useTranslation()
  const scrollViewRef = useRef<ScrollView>(null)

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true })
  }, [messages])

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{t('watchParty.chat')}</Text>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
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
          autoEnableMicrophone={isPanelOpen}
        />
      </View>
    </View>
  )
}

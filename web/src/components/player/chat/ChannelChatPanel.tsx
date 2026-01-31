/**
 * ChannelChatPanel Component
 * Main chat panel composing Header, Message list, and Input.
 * Supports compact (mini bar) and expanded modes, auto-hide behavior,
 * error boundary fallback, and keyboard navigation (Escape to close).
 */

import { useEffect, useCallback, useRef, useState } from 'react'
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors } from '@olorin/design-tokens'
import { MessageCircle, AlertTriangle } from 'lucide-react'
import { useChannelChat } from '../hooks/useChannelChat'
import type { ChatMessageData } from '@/services/channelChatTypes'
import { ChannelChatService } from '@/services/channelChatService'
import { useChannelChatStore } from '@/stores/channelChatSlice'
import { logger } from '@/utils/logger'
import ChannelChatHeader from './ChannelChatHeader'
import ChannelChatMessage from './ChannelChatMessage'
import ChannelChatInput from './ChannelChatInput'
import { panelStyles as styles } from './ChannelChatPanel.styles'

interface ChannelChatPanelProps {
  channelId: string
  isLiveChannel: boolean
}

const CHAT_MAX_LENGTH = 280
const AUTO_HIDE_MS = 10000

export default function ChannelChatPanel({
  channelId,
  isLiveChannel,
}: ChannelChatPanelProps) {
  const { t, i18n } = useTranslation()
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [showTranslation, setShowTranslation] = useState<Record<string, boolean>>({})

  const {
    isChatVisible,
    isChatExpanded,
    toggleChatVisibility,
    toggleChatExpanded,
  } = useChannelChatStore()

  const {
    isConnected,
    messages,
    userCount,
    isBetaUser,
    translationEnabled,
    error,
    sendMessage,
    reconnect,
    loadOlderMessages,
    hasMore,
    isLoadingMore,
  } = useChannelChat({ channelId, autoConnect: isLiveChannel })

  const handleToggleTranslation = useCallback(async (msg: ChatMessageData) => {
    const msgId = msg.id
    if (showTranslation[msgId]) {
      setShowTranslation((prev) => ({ ...prev, [msgId]: false }))
      return
    }
    if (!translations[msgId]) {
      const userLang = i18n.language?.split('-')[0] || 'en'
      const translated = await ChannelChatService.translateMessage(
        channelId, msg.message, msg.original_language, userLang,
      )
      if (translated) setTranslations((prev) => ({ ...prev, [msgId]: translated }))
    }
    setShowTranslation((prev) => ({ ...prev, [msgId]: true }))
  }, [channelId, i18n.language, showTranslation, translations])

  const resetAutoHide = useCallback(() => {
    if (autoHideTimer.current) clearTimeout(autoHideTimer.current)
    autoHideTimer.current = setTimeout(() => {
      if (isChatExpanded) toggleChatExpanded()
    }, AUTO_HIDE_MS)
  }, [isChatExpanded, toggleChatExpanded])

  useEffect(() => {
    if (isChatVisible && isChatExpanded) resetAutoHide()
    return () => {
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current)
    }
  }, [isChatVisible, isChatExpanded, resetAutoHide])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isChatVisible) toggleChatVisibility()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isChatVisible, toggleChatVisibility])

  const handleSendMessage = useCallback(
    (text: string) => {
      sendMessage(text)
      resetAutoHide()
    },
    [sendMessage, resetAutoHide],
  )

  if (!isChatVisible) return null

  if (error && !isConnected) {
    return (
      <View
        style={styles.panel}
        role="complementary"
        aria-label={t('channelChat.title')}
      >
        <View style={styles.errorContainer}>
          <AlertTriangle size={24} color={colors.error.DEFAULT} />
          <Text style={styles.errorText}>{t('channelChat.error')}</Text>
          <Pressable
            onPress={reconnect}
            style={styles.retryButton}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>{t('channelChat.retry')}</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  if (!isChatExpanded) {
    return (
      <Pressable
        onPress={toggleChatExpanded}
        style={styles.miniBar}
        accessibilityRole="button"
        accessibilityLabel={t('channelChat.title')}
      >
        <MessageCircle size={16} color={colors.primary.DEFAULT} />
        <Text style={styles.miniBarTitle}>{t('channelChat.title')}</Text>
        <Text style={styles.miniBarCount}>
          {t('channelChat.participants', { count: userCount })}
        </Text>
      </Pressable>
    )
  }

  return (
    <View
      style={styles.panel}
      role="complementary"
      aria-label={t('channelChat.title')}
      onPointerMove={resetAutoHide}
    >
      <ChannelChatHeader
        userCount={userCount}
        isBetaUser={isBetaUser}
        translationEnabled={translationEnabled}
        onClose={toggleChatVisibility}
        onToggleExpand={toggleChatExpanded}
        isExpanded={isChatExpanded}
      />
      <FlatList
        data={messages}
        renderItem={({ item }: { item: ChatMessageData }) => (
          <ChannelChatMessage
            message={item}
            showTranslation={showTranslation[item.id] || false}
            translatedText={translationEnabled ? translations[item.id] : undefined}
            onToggleTranslation={translationEnabled ? () => handleToggleTranslation(item) : undefined}
          />
        )}
        keyExtractor={(msg: ChatMessageData) => msg.id}
        inverted
        onEndReached={hasMore ? loadOlderMessages : undefined}
        onEndReachedThreshold={0.3}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
            </View>
          ) : null
        }
      />
      <ChannelChatInput
        onSendMessage={handleSendMessage}
        maxLength={CHAT_MAX_LENGTH}
        disabled={!isConnected}
      />
    </View>
  )
}

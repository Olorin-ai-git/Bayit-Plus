/**
 * ChannelChatMessage Component
 * Renders a single chat message with optional translation toggle.
 * Pinned messages receive a subtle highlight. RTL alignment is
 * driven by the message's original language direction.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { Pin, Languages } from 'lucide-react'
import type { ChatMessageData } from '@/services/channelChatTypes'

interface ChannelChatMessageProps {
  message: ChatMessageData
  showTranslation?: boolean
  translatedText?: string
  onToggleTranslation?: () => void
}

const RTL_LANGUAGES = ['he', 'ar', 'fa', 'ur']

const formatTimestamp = (ts: number): string => {
  const date = new Date(ts)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export default function ChannelChatMessage({
  message,
  showTranslation = false,
  translatedText,
  onToggleTranslation,
}: ChannelChatMessageProps) {
  const { t } = useTranslation()
  const isRTL = RTL_LANGUAGES.includes(message.originalLanguage)
  const displayText = showTranslation && translatedText
    ? translatedText
    : message.message

  return (
    <View
      style={[
        styles.container,
        message.isPinned && styles.pinnedContainer,
        isRTL && styles.rtlContainer,
      ]}
    >
      <View style={[styles.headerRow, isRTL && styles.rtlRow]}>
        <Text style={styles.userName}>{message.userName}</Text>
        <Text style={styles.timestamp}>{formatTimestamp(message.timestamp)}</Text>
        {message.isPinned && (
          <Pin size={10} color={colors.gold} />
        )}
      </View>
      <Text style={[styles.messageText, isRTL && styles.rtlText]}>
        {displayText}
      </Text>
      {translatedText && onToggleTranslation && (
        <Pressable
          onPress={onToggleTranslation}
          style={styles.translationToggle}
          accessibilityRole="button"
        >
          <Languages size={12} color={colors.primary[400]} />
          <Text style={styles.translationToggleText}>
            {showTranslation
              ? t('channelChat.showOriginal')
              : t('channelChat.showTranslation')}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pinnedContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
    borderRadius: borderRadius.sm,
  },
  rtlContainer: {
    alignItems: 'flex-end',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  userName: {
    color: colors.primary[300],
    fontSize: 12,
    fontWeight: '600',
  },
  timestamp: {
    color: colors.textMuted,
    fontSize: 10,
  },
  messageText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  rtlText: {
    textAlign: 'right',
  },
  translationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  translationToggleText: {
    color: colors.primary[400],
    fontSize: 11,
  },
})

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

const formatTimestamp = (ts: string): string => {
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
  const isSystemMessage = message.type === 'system_join' || message.type === 'system_leave'

  // Render system messages with minimal styling
  if (isSystemMessage) {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{message.message}</Text>
      </View>
    )
  }

  const isRTL = RTL_LANGUAGES.includes(message.original_language)
  const displayText = showTranslation && translatedText
    ? translatedText
    : message.message
  const userInitial = message.user_name.charAt(0).toUpperCase()

  return (
    <View
      style={[
        styles.container,
        message.is_pinned && styles.pinnedContainer,
      ]}
    >
      <View style={[styles.messageRow, isRTL && styles.rtlMessageRow]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userInitial}</Text>
        </View>
        <View style={styles.messageContent}>
          <View style={[styles.headerRow, isRTL && styles.rtlRow]}>
            <Text style={styles.userName}>{message.user_name}</Text>
            {message.user_role && (
              <View style={[
                styles.roleBadge,
                message.user_role === 'admin' && styles.adminBadge,
                message.user_role === 'moderator' && styles.moderatorBadge,
              ]}>
                <Text style={styles.roleText}>{message.user_role}</Text>
              </View>
            )}
            <Text style={styles.timestamp}>{formatTimestamp(message.timestamp)}</Text>
            {message.is_pinned && (
              <Pin size={10} color={colors.gold} />
            )}
          </View>
          <Text style={[styles.messageText, isRTL && styles.rtlText]}>
            {displayText}
          </Text>
        </View>
      </View>
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
  systemContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  systemText: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  pinnedContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
    borderRadius: borderRadius.sm,
  },
  messageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rtlMessageRow: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glassPurpleLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
  },
  avatarText: {
    color: colors.primary[300],
    fontSize: 14,
    fontWeight: '600',
  },
  messageContent: {
    flex: 1,
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
  roleBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.glassPurpleLight,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
  },
  adminBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  moderatorBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  roleText: {
    color: colors.primary[300],
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
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

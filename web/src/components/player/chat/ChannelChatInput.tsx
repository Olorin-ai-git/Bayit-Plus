/**
 * ChannelChatInput Component
 * Text input with character counter, send button, Enter-to-send,
 * Shift+Enter for newline, and rate limit warning display.
 */

import { useState, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet, TextInput, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { Send } from 'lucide-react'
import logger from '@/utils/logger'

const log = logger.scope('ChannelChatInput')

interface ChannelChatInputProps {
  onSendMessage: (text: string) => void
  maxLength: number
  disabled?: boolean
  rateLimitWarning?: string
}

export default function ChannelChatInput({
  onSendMessage,
  maxLength,
  disabled = false,
  rateLimitWarning,
}: ChannelChatInputProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')

  const handleTextChange = useCallback((newText: string) => {
    log.debug('Chat input text changed', { newText })
    setText(newText)
  }, [])

  const trimmedLength = text.trim().length
  const canSend = trimmedLength > 0 && !disabled

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (trimmed.length === 0 || disabled) {
      log.debug('Cannot send message', { isEmpty: trimmed.length === 0, disabled })
      return
    }
    log.info('Sending message', { trimmed })
    onSendMessage(trimmed)
    setText('')
  }, [text, disabled, onSendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      log.debug('Key pressed in chat input', { key: e.key, shift: e.shiftKey })
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        log.debug('Enter pressed - sending message')
        handleSend()
      }
    },
    [handleSend],
  )

  return (
    <View style={styles.container}>
      {rateLimitWarning && (
        <View style={styles.warningRow}>
          <Text style={styles.warningText}>
            {t('channelChat.rateLimitWarning')}
          </Text>
        </View>
      )}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleTextChange}
          placeholder={t('channelChat.inputPlaceholder')}
          placeholderTextColor={colors.inputPlaceholder}
          maxLength={maxLength}
          multiline
          editable={!disabled}
          accessibilityLabel={t('channelChat.inputLabel')}
          // @ts-expect-error -- onKeyDown and onClick supported on React Native Web
          onKeyDown={handleKeyDown}
          onClick={(e: any) => e?.stopPropagation?.()}
          onFocus={() => log.debug('Chat input focused')}
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel={t('channelChat.sendButton')}
        >
          <Send size={16} color={canSend ? colors.text : colors.textDisabled} />
        </Pressable>
      </View>
      <Text style={styles.charCounter}>
        {text.length}/{maxLength}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: colors.glassBorderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  warningRow: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  warningText: {
    color: colors.warning.DEFAULT,
    fontSize: 11,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.inputText,
    fontSize: 13,
    minHeight: 36,
    maxHeight: 80,
    // @ts-ignore - Web-specific styles to ensure text is visible
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none', // Remove default outline
      caretColor: colors.primary.DEFAULT, // Purple cursor
      lineHeight: '20px', // Ensure text has proper line height
      resize: 'none', // Disable manual resize
      fontFamily: 'system-ui, -apple-system, sans-serif',
      WebkitAppearance: 'none',
    }),
  } as any,
  sendButton: {
    backgroundColor: colors.buttonPrimary,
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  charCounter: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'right',
    marginTop: 2,
  },
})

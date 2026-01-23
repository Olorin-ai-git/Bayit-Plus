import { useState, useRef } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Send, Smile } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import { GlassView, GlassInput } from '@bayit/shared/ui'
import { isValidChatMessage, sanitizeChatMessage } from './chatSanitizer'
import { styles } from './WatchPartyChatInput.styles'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '👏', '🔥']

interface WatchPartyChatInputProps {
  onSend: (message: string, type?: string) => void
  disabled?: boolean
}

export default function WatchPartyChatInput({ onSend, disabled }: WatchPartyChatInputProps) {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)
  const inputRef = useRef<any>(null)

  const handleSubmit = () => {
    const trimmed = message.trim()
    if (!trimmed || disabled) return

    // Validate message
    if (!isValidChatMessage(trimmed)) {
      return
    }

    // Sanitize before sending
    const sanitized = sanitizeChatMessage(trimmed)
    onSend(sanitized)
    setMessage('')
    inputRef.current?.focus()
  }

  const handleEmojiClick = (emoji: string) => {
    onSend(emoji, 'emoji')
    setShowEmojis(false)
  }

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault?.()
      handleSubmit()
    }
  }

  return (
    <View style={styles.container}>
      {showEmojis && (
        <GlassView style={styles.emojiPanel} intensity="medium" accessibilityRole="menu" accessibilityLabel={t('watchParty.emojiPicker')}>
          {QUICK_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => handleEmojiClick(emoji)}
              style={styles.emojiButton}
              accessibilityRole="button"
              accessibilityLabel={t('watchParty.sendEmoji', { emoji })}
              accessibilityHint={t('watchParty.sendEmojiHint')}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </Pressable>
          ))}
        </GlassView>
      )}

      <View style={styles.inputRow}>
        <Pressable
          onPress={() => setShowEmojis(!showEmojis)}
          style={[styles.toggleEmojiButton, showEmojis && styles.emojiButtonActive]}
          accessibilityRole="button"
          accessibilityLabel={t('watchParty.toggleEmoji')}
          accessibilityHint={t('watchParty.toggleEmojiHint')}
          accessibilityState={{ expanded: showEmojis }}
        >
          <Smile size={18} color={colors.textSecondary} />
        </Pressable>

        <GlassInput
          ref={inputRef}
          value={message}
          onChangeText={setMessage}
          onKeyPress={handleKeyPress}
          placeholder={t('watchParty.typeMessage')}
          editable={!disabled}
          containerStyle={styles.inputContainer}
          inputStyle={styles.input}
          maxLength={500}
          accessibilityLabel={t('watchParty.chatInput')}
          accessibilityHint={t('watchParty.chatInputHint')}
        />

        <Pressable
          onPress={handleSubmit}
          disabled={!message.trim() || disabled}
          style={[
            styles.sendButton,
            !message.trim() || disabled ? styles.sendButtonDisabled : styles.sendButtonActive,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('watchParty.sendMessage')}
          accessibilityHint={t('watchParty.sendMessageHint')}
          accessibilityState={{ disabled: !message.trim() || disabled }}
        >
          <Send size={16} color={(!message.trim() || disabled) ? colors.textMuted : colors.background} />
        </Pressable>
      </View>
    </View>
  )
}
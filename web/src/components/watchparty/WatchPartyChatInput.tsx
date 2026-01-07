import { useState, useRef } from 'react'
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Send, Smile } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '👏', '🔥']

interface WatchPartyChatInputProps {
  onSend: (message: string, type?: string) => void
  disabled?: boolean
}

export default function WatchPartyChatInput({ onSend, disabled }: WatchPartyChatInputProps) {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)
  const inputRef = useRef<TextInput>(null)

  const handleSubmit = () => {
    const trimmed = message.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
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
        <GlassView style={styles.emojiPanel}>
          {QUICK_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => handleEmojiClick(emoji)}
              style={({ hovered }) => [
                styles.emojiButton,
                hovered && styles.emojiButtonHovered,
              ]}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          ))}
        </GlassView>
      )}

      <View style={styles.form}>
        <Pressable
          onPress={() => setShowEmojis(!showEmojis)}
          style={({ hovered }) => [
            styles.iconButton,
            showEmojis && styles.iconButtonActive,
            hovered && styles.iconButtonHovered,
          ]}
        >
          <Smile size={18} color={colors.textSecondary} />
        </Pressable>

        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            value={message}
            onChangeText={setMessage}
            onKeyPress={handleKeyPress}
            placeholder={t('watchParty.typeMessage')}
            placeholderTextColor={colors.textMuted}
            editable={!disabled}
            style={styles.input}
            maxLength={500}
          />
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={!message.trim() || disabled}
          style={({ hovered }) => [
            styles.sendButton,
            (!message.trim() || disabled) && styles.sendButtonDisabled,
            hovered && message.trim() && !disabled && styles.sendButtonHovered,
          ]}
        >
          <Send size={16} color={(!message.trim() || disabled) ? colors.textMuted : colors.background} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  emojiPanel: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: spacing.sm,
    right: 0,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.sm,
    zIndex: 50,
  },
  emojiButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  emojiButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  emoji: {
    fontSize: 18,
  },
  form: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    outlineStyle: 'none',
  } as any,
  sendButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendButtonHovered: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
})

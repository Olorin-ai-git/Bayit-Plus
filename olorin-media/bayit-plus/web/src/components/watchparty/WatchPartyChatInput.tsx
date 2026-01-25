import { useState, useRef, useEffect } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Send, Smile, Mic, MicOff } from 'lucide-react'
import { colors } from '@olorin/design-tokens'
import { GlassView, GlassInput } from '@bayit/shared/ui'
import { isValidChatMessage, sanitizeChatMessage } from './chatSanitizer'
import { webSpeechService } from '@bayit/shared/services/webSpeechService'
import type { SpeechRecognitionResult } from '@bayit/shared/services/webSpeechService'
import { styles } from './WatchPartyChatInput.styles'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '👏', '🔥']

interface WatchPartyChatInputProps {
  onSend: (message: string, type?: string) => void
  disabled?: boolean
  autoEnableMicrophone?: boolean
  onMicrophoneToggle?: (isListening: boolean) => void
}

export default function WatchPartyChatInput({
  onSend,
  disabled,
  autoEnableMicrophone = false,
  onMicrophoneToggle,
}: WatchPartyChatInputProps) {
  const { t, i18n } = useTranslation()
  const [message, setMessage] = useState('')
  const [showEmojis, setShowEmojis] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
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

  const handleToggleMicrophone = async () => {
    if (!webSpeechService.isSupported()) {
      return
    }

    try {
      if (isListening) {
        await webSpeechService.stopRecognition()
        setIsListening(false)
        setInterimTranscript('')
        onMicrophoneToggle?.(false)
      } else {
        // Set language based on current UI language
        webSpeechService.setLanguage(i18n.language)
        await webSpeechService.startRecognition()
        setIsListening(true)
        onMicrophoneToggle?.(true)
      }
    } catch (error) {
      console.error('Voice recognition error:', error)
      setIsListening(false)
      onMicrophoneToggle?.(false)
    }
  }

  // Handle speech recognition results
  useEffect(() => {
    const handleResult = (result: SpeechRecognitionResult) => {
      if (result.isFinal) {
        // Append final transcription to message
        setMessage((prev) => {
          const newMessage = prev ? `${prev} ${result.transcription}` : result.transcription
          return newMessage.trim()
        })
        setInterimTranscript('')
      } else {
        // Show interim transcription
        setInterimTranscript(result.transcription)
      }
    }

    const handleError = (error: { error: string }) => {
      console.error('Speech recognition error:', error)
      setIsListening(false)
      setInterimTranscript('')
      onMicrophoneToggle?.(false)
    }

    webSpeechService.addResultListener(handleResult)
    webSpeechService.addErrorListener(handleError)

    return () => {
      webSpeechService.removeResultListener(handleResult)
      webSpeechService.removeErrorListener(handleError)
    }
  }, [onMicrophoneToggle])

  // Auto-enable microphone when requested
  useEffect(() => {
    if (autoEnableMicrophone && webSpeechService.isSupported() && !isListening) {
      handleToggleMicrophone()
    }

    return () => {
      // Clean up: stop listening when component unmounts
      if (isListening) {
        webSpeechService.stopRecognition()
      }
    }
  }, [autoEnableMicrophone])

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

        {webSpeechService.isSupported() && (
          <Pressable
            onPress={handleToggleMicrophone}
            style={[styles.micButton, isListening && styles.micButtonActive]}
            accessibilityRole="button"
            accessibilityLabel={isListening ? t('watchParty.stopVoice') : t('watchParty.startVoice')}
            accessibilityHint={t('watchParty.voiceInputHint')}
            accessibilityState={{ selected: isListening }}
          >
            {isListening ? (
              <MicOff size={18} color={colors.primary.DEFAULT} />
            ) : (
              <Mic size={18} color={colors.textSecondary} />
            )}
          </Pressable>
        )}

        <GlassInput
          ref={inputRef}
          value={message + (interimTranscript ? ` ${interimTranscript}` : '')}
          onChangeText={setMessage}
          onKeyPress={handleKeyPress}
          placeholder={isListening ? t('watchParty.listening') : t('watchParty.typeMessage')}
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
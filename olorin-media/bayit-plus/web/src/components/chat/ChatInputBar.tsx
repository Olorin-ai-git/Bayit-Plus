import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Mic, Square, Send } from 'lucide-react'
import { GlassInput, GlassBadge } from '@bayit/shared/ui'
import { SoundwaveVisualizer } from '@bayit/shared'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'

declare const __TV__: boolean
const IS_TV = typeof __TV__ !== 'undefined' && __TV__

interface ChatInputBarProps {
  input: string
  isLoading?: boolean
  isRecording?: boolean
  isTranscribing?: boolean
  isRTL?: boolean
  isTVMode?: boolean
  audioLevel?: number
  inputRef?: React.RefObject<any>
  onInputChange?: (text: string) => void
  onSubmit?: () => void
  onToggleRecording?: () => void
}

export function ChatInputBar({
  input,
  isLoading = false,
  isRecording = false,
  isTranscribing = false,
  isRTL = false,
  isTVMode = false,
  audioLevel = 0,
  inputRef,
  onInputChange,
  onSubmit,
  onToggleRecording,
}: ChatInputBarProps) {
  const { t } = useTranslation()

  if (isTVMode) {
    return (
      <View style={styles.tvListeningContainer}>
        <View style={styles.tvListeningIndicator}>
          <SoundwaveVisualizer
            audioLevel={audioLevel}
            isListening={true}
            isProcessing={isLoading}
            isSendingToServer={isLoading}
            compact={false}
          />
          <Text style={styles.tvListeningText}>
            {isLoading ? t('chatbot.processing', 'Processing...') : t('chatbot.listening', 'Listening...')}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.inputContainer}>
      {(isRecording || isTranscribing) && (
        <View style={styles.statusContainer}>
          {isRecording && (
            <GlassBadge variant="danger" dot dotColor="danger" size="sm">
              {t('chatbot.recording')}
            </GlassBadge>
          )}
          {isTranscribing && (
            <GlassBadge
              variant="primary"
              size="sm"
              icon={<ActivityIndicator size="small" color={colors.primary} />}
            >
              {t('chatbot.transcribing')}
            </GlassBadge>
          )}
        </View>
      )}

      <View style={[styles.inputRow, isRTL && styles.inputRowRTL]}>
        <Pressable
          onPress={onToggleRecording}
          disabled={isLoading || isTranscribing}
          style={({ hovered }) => [
            styles.micButton,
            isRecording && styles.micButtonRecording,
            hovered && !isRecording && styles.micButtonHovered,
          ]}
          accessibilityLabel={isRecording ? t('chatbot.stopRecording') : t('chatbot.startRecording')}
        >
          {isRecording ? (
            <Square size={16} fill={colors.text} color={colors.text} />
          ) : (
            <Mic size={18} color={colors.text} />
          )}
        </Pressable>

        <GlassInput
          ref={inputRef}
          value={input}
          onChangeText={onInputChange}
          placeholder={t('chatbot.placeholder')}
          editable={!isLoading && !isRecording && !isTranscribing}
          onSubmitEditing={onSubmit}
          containerStyle={styles.textInputContainer}
          inputStyle={[styles.textInput, isRTL && styles.textInputRTL]}
        />

        <Pressable
          onPress={onSubmit}
          disabled={!input.trim() || isLoading || isRecording || isTranscribing}
          style={({ hovered }) => [
            styles.sendButton,
            (!input.trim() || isLoading) && styles.sendButtonDisabled,
            hovered && input.trim() && !isLoading && styles.sendButtonHovered,
          ]}
        >
          <Send size={16} color={colors.text} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  inputContainer: {
    padding: IS_TV ? spacing.lg : spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputRowRTL: {
    flexDirection: 'row-reverse',
  },
  micButton: {
    width: IS_TV ? 64 : 48,
    height: IS_TV ? 56 : 40,
    borderRadius: IS_TV ? 28 : 20,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonRecording: {
    backgroundColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  micButtonHovered: {
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  textInputContainer: {
    flex: 1,
    height: IS_TV ? 56 : 40,
    borderRadius: IS_TV ? 28 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: IS_TV ? 2 : 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: IS_TV ? spacing.lg : spacing.md,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: IS_TV ? 20 : 14,
    color: colors.text,
  },
  textInputRTL: {
    textAlign: 'right',
  },
  sendButton: {
    width: IS_TV ? 56 : 40,
    height: IS_TV ? 56 : 40,
    borderRadius: IS_TV ? 28 : 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonHovered: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  tvListeningContainer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tvListeningIndicator: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  tvListeningText: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
})

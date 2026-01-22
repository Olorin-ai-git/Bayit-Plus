import { View, Text, Pressable, ActivityIndicator } from 'react-native'
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
      <View className={`\${IS_TV ? 'p-6' : 'p-4'} border-t border-white/10 items-center justify-center`}>
        <View className="flex-col items-center justify-center gap-4 py-6 px-8">
          <SoundwaveVisualizer
            audioLevel={audioLevel}
            isListening={true}
            isProcessing={isLoading}
            isSendingToServer={isLoading}
            compact={false}
          />
          <Text className="text-[22px] text-[#8a2be2] font-semibold mt-2">
            {isLoading ? t('chatbot.processing', 'Processing...') : t('chatbot.listening', 'Listening...')}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View className={`\${IS_TV ? 'p-6' : 'p-4'} border-t border-white/10`}>
      {(isRecording || isTranscribing) && (
        <View className="flex-row justify-center mb-2">
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

      <View className={`flex-row items-center gap-2 \${isRTL ? 'flex-row-reverse' : ''}`}>
        <Pressable
          onPress={onToggleRecording}
          disabled={isLoading || isTranscribing}
          className={`\${IS_TV ? 'w-16 h-14 rounded-[28px]' : 'w-12 h-10 rounded-[20px]'} bg-[#8a2be2] items-center justify-center \${
            isRecording
              ? 'bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.5)]'
              : 'hover:shadow-[0_0_8px_rgba(138,43,226,0.5)]'
          }`}
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
          containerStyle={{
            flex: 1,
            height: IS_TV ? 56 : 40,
            borderRadius: IS_TV ? 28 : 20,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderWidth: IS_TV ? 2 : 1,
            borderColor: colors.glassBorder,
            paddingHorizontal: IS_TV ? spacing.lg : spacing.md,
            justifyContent: 'center',
          }}
          inputStyle={[
            { fontSize: IS_TV ? 20 : 14, color: colors.text },
            isRTL && { textAlign: 'right' }
          ]}
        />

        <Pressable
          onPress={onSubmit}
          disabled={!input.trim() || isLoading || isRecording || isTranscribing}
          className={`\${IS_TV ? 'w-14 h-14 rounded-[28px]' : 'w-10 h-10 rounded-[20px]'} bg-[#8a2be2] items-center justify-center \${
            (!input.trim() || isLoading)
              ? 'opacity-50'
              : 'hover:shadow-[0_0_8px_rgba(138,43,226,0.5)]'
          }`}
        >
          <Send size={16} color={colors.text} />
        </Pressable>
      </View>
    </View>
  )
}

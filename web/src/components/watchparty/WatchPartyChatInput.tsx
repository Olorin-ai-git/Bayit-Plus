import { useState, useRef } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Send, Smile } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import { GlassView, GlassInput } from '@bayit/shared/ui'

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
    <View className="relative">
      {showEmojis && (
        <GlassView className="absolute bottom-full mb-3 right-0 flex-row gap-2 p-3 z-50">
          {QUICK_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => handleEmojiClick(emoji)}
              className="w-8 h-8 items-center justify-center rounded-md hover:bg-white/10"
            >
              <Text className="text-lg">{emoji}</Text>
            </Pressable>
          ))}
        </GlassView>
      )}

      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => setShowEmojis(!showEmojis)}
          className={`w-9 h-9 items-center justify-center rounded-md ${showEmojis ? 'bg-white/10' : ''} hover:bg-white/5`}
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
          containerClassName="flex-1"
          inputClassName="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none"
          maxLength={500}
        />

        <Pressable
          onPress={handleSubmit}
          disabled={!message.trim() || disabled}
          className={`w-9 h-9 items-center justify-center rounded-md ${
            !message.trim() || disabled ? 'opacity-50 bg-white/10' : 'bg-purple-600'
          } ${message.trim() && !disabled ? 'hover:shadow-[0_0_8px_rgba(168,85,247,0.5)]' : ''}`}
        >
          <Send size={16} color={(!message.trim() || disabled) ? colors.textMuted : colors.background} />
        </Pressable>
      </View>
    </View>
  )
}

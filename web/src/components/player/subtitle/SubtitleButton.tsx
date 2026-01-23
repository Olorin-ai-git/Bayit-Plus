/**
 * SubtitleButton Component
 * Button with badge showing current subtitle language
 */

import { View, Text, Pressable } from 'react-native'
import { Subtitles } from 'lucide-react'
import { z } from 'zod'
import { platformClass } from '@/utils/platformClass'
import { getLanguageInfo } from '@/types/subtitle'

// Zod schema for props validation
const SubtitleButtonPropsSchema = z.object({
  enabled: z.boolean(),
  currentLanguage: z.string().nullable(),
  isMenuOpen: z.boolean(),
  onClick: z.function().args().returns(z.void()),
})

export type SubtitleButtonProps = z.infer<typeof SubtitleButtonPropsSchema>

export default function SubtitleButton({
  enabled,
  currentLanguage,
  isMenuOpen,
  onClick,
}: SubtitleButtonProps) {
  // Validate props in development
  if (process.env.NODE_ENV === 'development') {
    SubtitleButtonPropsSchema.parse({
      enabled,
      currentLanguage,
      isMenuOpen,
      onClick,
    })
  }

  const currentLangInfo = currentLanguage ? getLanguageInfo(currentLanguage) : null
  const isActive = enabled || isMenuOpen

  return (
    <Pressable
      onPress={onClick}
      className={platformClass(
        `w-11 h-11 items-center justify-center rounded-lg relative ${
          isActive ? 'bg-white/15 hover:bg-white/20' : 'hover:bg-white/10'
        }`,
        `w-11 h-11 items-center justify-center rounded-lg relative ${
          isActive ? 'bg-white/15' : ''
        }`
      )}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Subtitles
        size={24}
        color={enabled ? '#8b5cf6' : '#a1a1aa'}
      />
      {currentLangInfo && enabled && (
        <View className="absolute top-1 right-1 bg-purple-500 rounded-lg px-1 py-0.5 min-w-[20px]">
          <Text className="text-white text-[9px] font-bold text-center">
            {currentLangInfo.code.toUpperCase()}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

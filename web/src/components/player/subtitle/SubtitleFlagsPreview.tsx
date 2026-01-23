/**
 * SubtitleFlagsPreview Component
 * Visual flag preview of available subtitle languages
 */

import { View, Text, Pressable } from 'react-native'
import { z } from 'zod'
import { platformClass } from '@/utils/platformClass'
import { SubtitleTrack, getLanguageInfo } from '@/types/subtitle'

// Zod schema for props
const SubtitleFlagsPreviewPropsSchema = z.object({
  availableLanguages: z.array(z.any()),
  currentLanguage: z.string().nullable(),
  enabled: z.boolean(),
  onLanguageSelect: z.function().args(z.string()).returns(z.void()),
})

export type SubtitleFlagsPreviewProps = z.infer<typeof SubtitleFlagsPreviewPropsSchema>

export default function SubtitleFlagsPreview({
  availableLanguages,
  currentLanguage,
  enabled,
  onLanguageSelect,
}: SubtitleFlagsPreviewProps) {
  // Validate props in development
  if (process.env.NODE_ENV === 'development') {
    SubtitleFlagsPreviewPropsSchema.parse({
      availableLanguages,
      currentLanguage,
      enabled,
      onLanguageSelect,
    })
  }

  if (availableLanguages.length === 0) return null

  const stopPropagation = (e: any) => e.stopPropagation()

  const handleLanguagePress = (language: string) => (e: any) => {
    e?.stopPropagation?.()
    onLanguageSelect(language)
  }

  return (
    <View className="flex-row flex-wrap justify-center items-center gap-2 p-4 border-b border-white/10">
      {availableLanguages.map((track: SubtitleTrack) => {
        const langInfo = getLanguageInfo(track.language)
        const isActive = track.language === currentLanguage && enabled
        return (
          <Pressable
            key={track.id}
            onPress={handleLanguagePress(track.language)}
            onClick={stopPropagation}
            className={platformClass(
              `w-12 h-12 rounded-lg items-center justify-center bg-white/5 border-2 ${
                isActive
                  ? 'border-purple-400 bg-purple-500/20'
                  : 'border-transparent hover:bg-white/10'
              }`
            )}
          >
            <Text className="text-[28px]">{langInfo?.flag || '🌐'}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

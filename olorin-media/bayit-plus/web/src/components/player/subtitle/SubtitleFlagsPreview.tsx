/**
 * SubtitleFlagsPreview Component
 * Visual flag preview of available subtitle languages
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { z } from 'zod'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
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
    <View style={styles.container}>
      {availableLanguages.map((track: SubtitleTrack) => {
        const langInfo = getLanguageInfo(track.language)
        const isActive = track.language === currentLanguage && enabled
        return (
          <Pressable
            key={track.id}
            onPress={handleLanguagePress(track.language)}
            onClick={stopPropagation}
            style={[
              styles.flagButton,
              isActive && styles.flagButtonActive
            ]}
          >
            <Text style={styles.flagText}>{langInfo?.flag || '🌐'}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderWhite,
  },
  flagButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  flagButtonActive: {
    borderColor: colors.primaryLight,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  flagText: {
    fontSize: 28,
  },
})

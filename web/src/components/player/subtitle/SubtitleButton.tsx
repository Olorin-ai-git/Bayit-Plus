/**
 * SubtitleButton Component
 * Button with badge showing current subtitle language
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Subtitles } from 'lucide-react'
import { z } from 'zod'
import { colors, borderRadius, spacing } from '@bayit/shared/theme'
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
      style={({ pressed }) => [
        styles.button,
        isActive && styles.buttonActive,
        { opacity: pressed ? 0.7 : 1 }
      ]}
    >
      <Subtitles
        size={24}
        color={enabled ? colors.primary : colors.textSecondary}
      />
      {currentLangInfo && enabled && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {currentLangInfo.code.toUpperCase()}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    position: 'relative',
  },
  buttonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    minWidth: 20,
  },
  badgeText: {
    color: colors.text,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
})

/**
 * SubtitleLanguageList Component
 * List of available subtitle languages
 */

import { useState } from 'react'
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { SubtitleTrack, getLanguageInfo, HebrewMode } from '@/types/subtitle'
import HebrewModePickerModal from './HebrewModePickerModal'

// Zod schema for props
const SubtitleLanguageListPropsSchema = z.object({
  availableLanguages: z.array(z.any()),
  currentLanguage: z.string().nullable(),
  hebrewMode: z.enum(['regular', 'nikud', 'shoresh']).optional(),
  enabled: z.boolean(),
  isLoading: z.boolean(),
  onLanguageSelect: z.function().args(z.string()).returns(z.void()),
  onHebrewModeChange: z.function().args(z.enum(['regular', 'nikud', 'shoresh'])).returns(z.void()).optional(),
  onDisable: z.function().args().returns(z.void()),
})

export type SubtitleLanguageListProps = z.infer<typeof SubtitleLanguageListPropsSchema>

export default function SubtitleLanguageList({
  availableLanguages,
  currentLanguage,
  hebrewMode = 'regular',
  enabled,
  isLoading,
  onLanguageSelect,
  onHebrewModeChange,
  onDisable,
}: SubtitleLanguageListProps) {
  const { t } = useTranslation()
  const [showHebrewModePicker, setShowHebrewModePicker] = useState(false)

  // Validate props in development
  if (process.env.NODE_ENV === 'development') {
    SubtitleLanguageListPropsSchema.parse({
      availableLanguages,
      currentLanguage,
      hebrewMode,
      enabled,
      isLoading,
      onLanguageSelect,
      onHebrewModeChange,
      onDisable,
    })
  }

  const getHebrewModeIcon = (mode: HebrewMode): string => {
    const icons: Record<HebrewMode, string> = {
      regular: '🔤',
      nikud: 'א׳',
      shoresh: '📖',
    }
    return icons[mode]
  }

  const stopPropagation = (e: any) => {
    e.stopPropagation()
    e.preventDefault()
  }

  const handleLanguagePress = (language: string) => (e: any) => {
    e?.stopPropagation?.()
    // Clear selection if clicking the same language (toggle off)
    if (enabled && language === currentLanguage) {
      onDisable()
    } else {
      onLanguageSelect(language)
    }
  }

  const handleDisablePress = (e: any) => {
    e?.stopPropagation?.()
    onDisable()
  }

  // Determine if "Off" is selected (no language selected OR subtitles disabled)
  const isOffSelected = !enabled || !currentLanguage

  return (
    <>
      {/* Off option */}
      <Pressable
        onPress={handleDisablePress}
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
        style={({ pressed }) => [
          styles.option,
          isOffSelected ? styles.optionActive : styles.optionInactive,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.optionText, isOffSelected ? styles.textActive : styles.textInactive]}>
          {t('subtitles.off')}
        </Text>
        {isOffSelected && <View style={styles.activeIndicator} />}
      </Pressable>

      {/* Available languages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>
            {t('common.loading', 'Loading...')}
          </Text>
        </View>
      ) : availableLanguages.length > 0 ? (
        availableLanguages.map((track: SubtitleTrack) => {
          const langInfo = getLanguageInfo(track.language)
          const isActive = enabled && track.language === currentLanguage
          const isHebrew = track.language === 'he'

          // Hebrew track with split button for mode selection
          if (isHebrew && onHebrewModeChange) {
            return (
              <View key={track.id} style={styles.splitButtonContainer}>
                {/* Main language button (left side) */}
                <Pressable
                  onPress={handleLanguagePress(track.language)}
                  onClick={stopPropagation}
                  onMouseDown={stopPropagation}
                  style={({ pressed }) => [
                    styles.option,
                    styles.splitButtonLeft,
                    isActive ? styles.optionActive : styles.optionInactive,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <View style={[styles.flagBadge, isActive && styles.flagBadgeActive]}>
                    <Text style={styles.flagText}>{langInfo?.flag || '🌐'}</Text>
                  </View>
                  <View style={styles.languageInfo}>
                    <Text style={[styles.languageName, isActive ? styles.textActive : styles.textInactive]}>
                      {track.language_name}
                    </Text>
                  </View>
                  {isActive && <View style={styles.activeIndicator} />}
                </Pressable>

                {/* Mode picker button (right side) */}
                <Pressable
                  onPress={(e) => {
                    e?.stopPropagation?.()
                    setShowHebrewModePicker(true)
                  }}
                  onClick={stopPropagation}
                  onMouseDown={stopPropagation}
                  style={({ pressed }) => [
                    styles.splitButtonRight,
                    isActive ? styles.optionActive : styles.optionInactive,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={styles.modeIcon}>{getHebrewModeIcon(hebrewMode)}</Text>
                  <Text style={styles.chevron}>▼</Text>
                </Pressable>

                {/* Hebrew Mode Picker Modal */}
                {showHebrewModePicker && (
                  <HebrewModePickerModal
                    visible={showHebrewModePicker}
                    currentMode={hebrewMode}
                    hasNikud={track.has_nikud_version || false}
                    hasShoresh={track.has_shoresh_version || false}
                    onClose={() => setShowHebrewModePicker(false)}
                    onModeSelect={(mode) => {
                      onHebrewModeChange(mode)
                      setShowHebrewModePicker(false)
                    }}
                  />
                )}
              </View>
            )
          }

          // Regular language button (non-Hebrew)
          return (
            <Pressable
              key={track.id}
              onPress={handleLanguagePress(track.language)}
              onClick={stopPropagation}
              onMouseDown={stopPropagation}
              style={({ pressed }) => [
                styles.option,
                styles.languageOption,
                isActive ? styles.optionActive : styles.optionInactive,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.flagBadge, isActive && styles.flagBadgeActive]}>
                <Text style={styles.flagText}>{langInfo?.flag || '🌐'}</Text>
              </View>
              <View style={styles.languageInfo}>
                <Text style={[styles.languageName, isActive ? styles.textActive : styles.textInactive]}>
                  {track.language_name}
                </Text>
                {track.is_auto_generated && (
                  <Text style={styles.autoText}>
                    {t('subtitles.autoGenerated')}
                  </Text>
                )}
              </View>
              {isActive && <View style={styles.activeIndicator} />}
            </Pressable>
          )
        })
      ) : (
        <View
          onClick={stopPropagation}
          onMouseDown={stopPropagation}
          onMouseUp={stopPropagation}
          style={styles.emptyOption}
        >
          <Text style={styles.flagText}>🚫</Text>
          <Text style={styles.emptyText}>
            {t('subtitles.none', 'None')}
          </Text>
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md - 4,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    backgroundColor: colors.glass,
  },
  languageOption: {
    marginTop: spacing.xs,
  },
  optionActive: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.glassPurpleLight,
  },
  optionInactive: {
    borderColor: colors.glassBorderWhite,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textActive: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  textInactive: {
    color: colors.textSecondary,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.DEFAULT,
    marginLeft: spacing.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg + spacing.sm,
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  flagBadge: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  flagBadgeActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: colors.primary.DEFAULT,
  },
  flagText: {
    fontSize: 24,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 14,
    fontWeight: '500',
  },
  autoText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  emptyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md - 4,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorderWhite,
    backgroundColor: colors.glass,
    cursor: 'default',
    pointerEvents: 'none',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  splitButtonContainer: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  splitButtonLeft: {
    flex: 1,
  },
  splitButtonRight: {
    minWidth: 44,  // iOS HIG minimum touch target
    minHeight: 44,  // iOS HIG minimum touch target
    width: 60,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,  // Increased from spacing.sm for better touch area
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    backgroundColor: colors.glass,
    gap: 2,
  },
  modeIcon: {
    fontSize: 18,
  },
  chevron: {
    fontSize: 10,
    color: colors.textSecondary,
  },
});

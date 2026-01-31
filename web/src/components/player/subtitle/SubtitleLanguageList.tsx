/**
 * SubtitleLanguageList Component
 * List of available subtitle languages
 */

import { View, Text, Pressable, ActivityIndicator, StyleSheet, Platform, PixelRatio } from 'react-native'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Icon } from '@olorin/shared-icons/web'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { SubtitleTrack, getLanguageInfo, HebrewMode, EnglishMode } from '@/types/subtitle'
import { FlagWithSparkle } from '@/components/common/FlagWithSparkle'

const isTV = Platform.isTV || Platform.OS === 'tvos'
const isIOS = Platform.OS === 'ios'

// Get font scale for iOS Dynamic Type support
const fontScale = isIOS ? PixelRatio.getFontScale() : 1

// Zod schema for props
const SubtitleLanguageListPropsSchema = z.object({
  availableLanguages: z.array(z.any()),
  currentLanguage: z.string().nullable(),
  hebrewMode: z.enum(['regular', 'nikud', 'shoresh']).optional(),
  englishMode: z.enum(['regular', 'heblish', 'grammarFlip', 'slangSynthesis']).optional(),
  enabled: z.boolean(),
  isLoading: z.boolean(),
  contentId: z.string().optional(),
  onLanguageSelect: z.function().args(z.string()).returns(z.void()),
  onHebrewModeChange: z.function().args(z.enum(['regular', 'nikud', 'shoresh'])).returns(z.void()).optional(),
  onEnglishModeChange: z.function().args(z.enum(['regular', 'heblish'])).returns(z.void()).optional(),
  onDisable: z.function().args().returns(z.void()),
  onSubtitlesRefresh: z.function().args().returns(z.void()).optional(),
  onOpenHebrewModePicker: z.function().args().returns(z.void()).optional(),
  onOpenEnglishModePicker: z.function().args().returns(z.void()).optional(),
})

export type SubtitleLanguageListProps = z.infer<typeof SubtitleLanguageListPropsSchema>

export default function SubtitleLanguageList({
  availableLanguages,
  currentLanguage,
  hebrewMode = 'regular',
  englishMode = 'regular',
  enabled,
  isLoading,
  contentId,
  onLanguageSelect,
  onHebrewModeChange,
  onEnglishModeChange,
  onDisable,
  onSubtitlesRefresh,
  onOpenHebrewModePicker,
  onOpenEnglishModePicker,
}: SubtitleLanguageListProps) {
  const { t } = useTranslation()

  // Validate props in development
  if (process.env.NODE_ENV === 'development') {
    SubtitleLanguageListPropsSchema.parse({
      availableLanguages,
      currentLanguage,
      hebrewMode,
      englishMode,
      enabled,
      isLoading,
      contentId,
      onLanguageSelect,
      onHebrewModeChange,
      onEnglishModeChange,
      onDisable,
      onSubtitlesRefresh,
      onOpenHebrewModePicker,
      onOpenEnglishModePicker,
    })
  }

  const getHebrewModeIcon = (mode: HebrewMode) => {
    const icons: Record<HebrewMode, { isIconName: boolean; value: string }> = {
      regular: { isIconName: true, value: 'settings' },
      nikud: { isIconName: false, value: 'א׳' },
      shoresh: { isIconName: true, value: 'stories' },
    }
    return icons[mode]
  }

  const getEnglishModeIcon = (mode: EnglishMode) => {
    const icons: Record<EnglishMode, { isIconName: boolean; value: string }> = {
      regular: { isIconName: true, value: 'settings' },
      heblish: { isIconName: true, value: 'translate' },
      grammarFlip: { isIconName: true, value: 'shuffle' },
      slangSynthesis: { isIconName: true, value: 'chatBubble' },
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
        hasTVPreferredFocus={isTV}
        tvParallaxProperties={{
          enabled: true,
          magnification: 1.05,
          pressMagnification: 0.95,
        }}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={t('subtitles.off')}
        accessibilityHint={t('subtitles.offHint', 'Turn off subtitles')}
        accessibilityState={{ selected: isOffSelected }}
        style={({ pressed, focused }) => [
          styles.option,
          isOffSelected ? styles.optionActive : styles.optionInactive,
          focused && isTV && styles.tvFocused,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text
          style={[styles.optionText, isOffSelected ? styles.textActive : styles.textInactive]}
          allowFontScaling={isIOS}
          maxFontSizeMultiplier={isIOS ? 1.5 : undefined}
        >
          {t('subtitles.off')}
        </Text>
        {isOffSelected && <View style={styles.activeIndicator} />}
      </Pressable>

      {/* Available languages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text
            style={styles.loadingText}
            allowFontScaling={isIOS}
            maxFontSizeMultiplier={isIOS ? 1.5 : undefined}
          >
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
                  tvParallaxProperties={{
                    enabled: true,
                    magnification: 1.05,
                    pressMagnification: 0.95,
                  }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`${track.language_name} ${t('subtitles.subtitles', 'subtitles')}`}
                  accessibilityHint={isActive ? t('subtitles.currentLanguage', 'Currently selected') : t('subtitles.selectLanguage', 'Double tap to select')}
                  accessibilityState={{ selected: isActive }}
                  style={({ pressed, focused }) => [
                    styles.option,
                    styles.splitButtonLeft,
                    isActive ? styles.optionActive : styles.optionInactive,
                    focused && isTV && styles.tvFocused,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <View style={[styles.flagBadge, isActive && styles.flagBadgeActive]}>
                    <FlagWithSparkle
                      language={track.language}
                      hasAI={track.has_nikud_version || track.has_shoresh_version}
                      size="medium"
                      showTooltip={false}
                    />
                  </View>
                  <View style={styles.languageInfo}>
                    <Text
                      style={[styles.languageName, isActive ? styles.textActive : styles.textInactive]}
                      allowFontScaling={isIOS}
                      maxFontSizeMultiplier={isIOS ? 1.5 : undefined}
                    >
                      {track.language_name}
                    </Text>
                  </View>
                  {isActive && <View style={styles.activeIndicator} />}
                </Pressable>

                {/* Mode picker button (right side) - using native button for web */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    onOpenHebrewModePicker?.()
                  }}
                  aria-label={`${t('subtitles.hebrewMode.title', 'Hebrew mode')}: ${t(`subtitles.hebrewMode.${hebrewMode}.title`, hebrewMode)}`}
                  style={{
                    minWidth: 44,
                    minHeight: 44,
                    width: 52,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingLeft: 8,
                    paddingRight: 8,
                    paddingTop: 4,
                    paddingBottom: 4,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: isActive ? colors.primaryLight : colors.glassBorderWhite,
                    backgroundColor: isActive ? colors.glassPurpleLight : colors.glass,
                    gap: 2,
                    cursor: 'pointer',
                  }}
                >
                  {(() => {
                    const modeIcon = getHebrewModeIcon(hebrewMode)
                    return modeIcon.isIconName ? (
                      <Icon name={modeIcon.value} size="md" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modeIcon}>{modeIcon.value}</Text>
                    )
                  })()}
                  <Icon name="chevronDown" size="sm" color={colors.textSecondary} />
                </button>
              </View>
            )
          }

          // English track with split button for mode selection
          const isEnglish = track.language === 'en'
          if (isEnglish && onEnglishModeChange) {
            return (
              <View key={track.id} style={styles.splitButtonContainer}>
                {/* Main language button (left side) */}
                <Pressable
                  onPress={handleLanguagePress(track.language)}
                  onClick={stopPropagation}
                  onMouseDown={stopPropagation}
                  tvParallaxProperties={{
                    enabled: true,
                    magnification: 1.05,
                    pressMagnification: 0.95,
                  }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`${track.language_name} ${t('subtitles.subtitles', 'subtitles')}`}
                  accessibilityHint={isActive ? t('subtitles.currentLanguage', 'Currently selected') : t('subtitles.selectLanguage', 'Double tap to select')}
                  accessibilityState={{ selected: isActive }}
                  style={({ pressed, focused }) => [
                    styles.option,
                    styles.splitButtonLeft,
                    isActive ? styles.optionActive : styles.optionInactive,
                    focused && isTV && styles.tvFocused,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <View style={[styles.flagBadge, isActive && styles.flagBadgeActive]}>
                    <FlagWithSparkle
                      language={track.language}
                      hasAI={track.has_heblish_version || track.has_grammar_flip_version || track.has_slang_synthesis_version}
                      size="medium"
                      showTooltip={false}
                    />
                  </View>
                  <View style={styles.languageInfo}>
                    <Text
                      style={[styles.languageName, isActive ? styles.textActive : styles.textInactive]}
                      allowFontScaling={isIOS}
                      maxFontSizeMultiplier={isIOS ? 1.5 : undefined}
                    >
                      {track.language_name}
                    </Text>
                  </View>
                  {isActive && <View style={styles.activeIndicator} />}
                </Pressable>

                {/* Mode picker button (right side) - using native button for web */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    onOpenEnglishModePicker?.()
                  }}
                  aria-label={`${t('subtitles.englishMode.title', 'English mode')}: ${t(`subtitles.englishMode.${englishMode}.title`, englishMode)}`}
                  style={{
                    minWidth: 44,
                    minHeight: 44,
                    width: 52,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingLeft: 8,
                    paddingRight: 8,
                    paddingTop: 4,
                    paddingBottom: 4,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: isActive ? colors.primaryLight : colors.glassBorderWhite,
                    backgroundColor: isActive ? colors.glassPurpleLight : colors.glass,
                    gap: 2,
                    cursor: 'pointer',
                  }}
                >
                  {(() => {
                    const modeIcon = getEnglishModeIcon(englishMode)
                    return modeIcon.isIconName ? (
                      <Icon name={modeIcon.value} size="md" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modeIcon}>{modeIcon.value}</Text>
                    )
                  })()}
                  <Icon name="chevronDown" size="sm" color={colors.textSecondary} />
                </button>
              </View>
            )
          }

          // Regular language button (non-Hebrew, non-English)
          return (
            <Pressable
              key={track.id}
              onPress={handleLanguagePress(track.language)}
              onClick={stopPropagation}
              onMouseDown={stopPropagation}
              tvParallaxProperties={{
                enabled: true,
                magnification: 1.05,
                pressMagnification: 0.95,
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${track.language_name} ${t('subtitles.subtitles', 'subtitles')}${track.is_auto_generated ? ` (${t('subtitles.autoGenerated', 'auto-generated')})` : ''}`}
              accessibilityHint={isActive ? t('subtitles.currentLanguage', 'Currently selected') : t('subtitles.selectLanguage', 'Double tap to select')}
              accessibilityState={{ selected: isActive }}
              style={({ pressed, focused }) => [
                styles.option,
                styles.languageOption,
                isActive ? styles.optionActive : styles.optionInactive,
                focused && isTV && styles.tvFocused,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.flagBadge, isActive && styles.flagBadgeActive]}>
                <FlagWithSparkle
                  language={track.language}
                  hasAI={false}
                  size="medium"
                  showTooltip={false}
                />
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
          <Icon name="error" size="lg" color="#FFFFFF" style={{ marginRight: spacing.sm }} />
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
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
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
    fontSize: 18,
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
    width: 52,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    backgroundColor: colors.glass,
    gap: 2,
  },
  modeIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  tvFocused: {
    borderColor: colors.primary.DEFAULT,
    borderWidth: 3,
    transform: [{ scale: 1.05 }],
  },
});

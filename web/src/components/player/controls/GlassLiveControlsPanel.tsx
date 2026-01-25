/**
 * GlassLiveControlsPanel Component
 * Horizontal expandable glassmorphic panel for live channel controls
 * Contains Live Language Magic (premium), Live Translate, and Live Dubbing buttons
 */

import { useRef, useEffect, useState } from 'react'
import { View, Text, Pressable, Animated, StyleSheet, Modal } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Languages, Maximize, Minimize, Sparkles, X } from 'lucide-react'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { isTV } from '@bayit/shared/utils/platform'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { GlassView } from '@bayit/shared/ui'

// Language flag emoji map
const LANG_FLAGS: Record<string, string> = {
  he: '🇮🇱',
  en: '🇺🇸',
  ar: '🇸🇦',
  es: '🇪🇸',
  ru: '🇷🇺',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  yi: '🕍',
}

interface GlassLiveControlsPanelProps {
  isExpanded: boolean
  onToggleExpand: () => void
  currentLanguage: string
  availableLanguages: string[]
  onLanguageChange: (lang: string) => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
  isDubbingActive?: boolean
  onHoveredButtonChange?: (button: string | null) => void
  renderLiveSubtitleControls?: () => React.ReactNode
  renderDubbingControls?: () => React.ReactNode
}

export function GlassLiveControlsPanel({
  isExpanded,
  onToggleExpand,
  currentLanguage,
  availableLanguages,
  onLanguageChange,
  isFullscreen,
  onToggleFullscreen,
  isDubbingActive = false,
  onHoveredButtonChange,
  renderLiveSubtitleControls,
  renderDubbingControls,
}: GlassLiveControlsPanelProps) {
  const { t } = useTranslation()
  const [isHovered, setIsHovered] = useState(false)
  const [showLanguagePicker, setShowLanguagePicker] = useState(false)
  const expandAnim = useRef(new Animated.Value(0)).current
  const fullscreenFocus = useTVFocus({ styleType: 'button' })

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }, [isExpanded, expandAnim])

  const panelWidth = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 720],
  })

  const contentOpacity = expandAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  })

  const flag = LANG_FLAGS[currentLanguage] || currentLanguage.toUpperCase()
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)

  const getTooltipText = () => {
    switch (hoveredButton) {
      case 'flag':
        return t('player.selectLanguage', 'Select Language')
      case 'expand':
        return isExpanded
          ? t('player.hideLanguageControls', 'Hide Language Controls')
          : t('player.showLanguageControls', 'Show Language Controls')
      case 'fullscreen':
        return isFullscreen
          ? t('player.exitFullscreen', 'Exit Fullscreen')
          : t('player.enterFullscreen', 'Enter Fullscreen')
      case 'liveTranslate':
        return t('subtitles.liveTranslate', 'Live Translate')
      case 'liveDubbing':
        return t('dubbing.title', 'Live Dubbing')
      case 'voiceSelector':
        return t('dubbing.selectVoice', 'Select Voice')
      default:
        return null
    }
  }

  const handleHoverChange = (button: string | null) => {
    setHoveredButton(button)
    onHoveredButtonChange?.(button)
  }

  const tooltipText = getTooltipText()

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.panelContainer, { width: panelWidth }]}>
        {/* Glass background with single clean border */}
        <View style={styles.glassBackground}>
          <View style={styles.contentRow}>
            {/* Live Language Magic Toggle Button */}
            <View style={styles.languageSettingsButton}>
              <Pressable
                onPress={() => setShowLanguagePicker(true)}
                onHoverIn={() => handleHoverChange('flag')}
                onHoverOut={() => handleHoverChange(null)}
                style={styles.flagBadge}
                accessibilityRole="button"
                accessibilityLabel={t('player.selectLanguage', 'Select Language')}
              >
                <Text style={styles.flagText}>{flag}</Text>
              </Pressable>
              <Pressable
                onPress={onToggleExpand}
                onHoverIn={() => {
                  setIsHovered(true)
                  handleHoverChange('expand')
                }}
                onHoverOut={() => {
                  setIsHovered(false)
                  handleHoverChange(null)
                }}
                style={[styles.expandButton, isHovered && styles.buttonHovered]}
                accessibilityRole="button"
                accessibilityLabel={t('player.liveLanguageMagic', 'Live Language Magic')}
                accessibilityState={{ expanded: isExpanded }}
              >
                <Languages
                  size={isTV ? 24 : 20}
                  color={isExpanded ? colors.primary : colors.text}
                />
                <Text
                  style={[
                    styles.languageSettingsText,
                    isExpanded && styles.textActive,
                  ]}
                >
                  {t('player.liveLanguageMagic', 'Live Language Magic')}
                </Text>
                <Sparkles
                  size={isTV ? 18 : 16}
                  color={colors.primary.DEFAULT}
                  style={styles.premiumIcon}
                />
              </Pressable>
            </View>

            {/* Expanded Controls */}
            {isExpanded && (
              <Animated.View style={[styles.expandedControls, { opacity: contentOpacity }]}>
                {/* Divider */}
                <View style={styles.divider} />

                {/* Live Translate - hidden when dubbing is active */}
                {!isDubbingActive && renderLiveSubtitleControls && (
                  <View style={styles.controlItem}>
                    {renderLiveSubtitleControls()}
                  </View>
                )}

                {/* Live Dubbing */}
                {renderDubbingControls && (
                  <View style={styles.controlItem}>
                    {renderDubbingControls()}
                  </View>
                )}
              </Animated.View>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Fullscreen Button - Always visible outside the panel */}
      <Pressable
        onPress={onToggleFullscreen}
        onFocus={fullscreenFocus.handleFocus}
        onBlur={fullscreenFocus.handleBlur}
        onHoverIn={() => handleHoverChange('fullscreen')}
        onHoverOut={() => handleHoverChange(null)}
        focusable={true}
        style={({ hovered }: { hovered?: boolean }) => [
          styles.fullscreenButton,
          hovered && styles.buttonHovered,
          fullscreenFocus.isFocused && fullscreenFocus.focusStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={isFullscreen ? t('player.exitFullscreen') : t('player.enterFullscreen')}
      >
        {isFullscreen ? (
          <Minimize size={isTV ? 24 : 20} color={colors.text} />
        ) : (
          <Maximize size={isTV ? 24 : 20} color={colors.text} />
        )}
      </Pressable>

      {/* Language Picker Modal */}
      {showLanguagePicker && (
        <Modal
          visible={showLanguagePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLanguagePicker(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowLanguagePicker(false)}
          >
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <GlassView style={styles.languagePickerContainer} intensity="high">
                {/* Header */}
                <View style={styles.languagePickerHeader}>
                  <Text style={styles.languagePickerTitle}>
                    {t('player.selectLanguage', 'Select Language')}
                  </Text>
                  <Pressable
                    onPress={() => setShowLanguagePicker(false)}
                    style={styles.closeButton}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.close', 'Close')}
                  >
                    <X size={20} color={colors.text} />
                  </Pressable>
                </View>

                {/* Language List */}
                <View style={styles.languageList}>
                  {availableLanguages.map((lang) => {
                    const langFlag = LANG_FLAGS[lang] || lang.toUpperCase()
                    const isSelected = lang === currentLanguage
                    return (
                      <Pressable
                        key={lang}
                        onPress={() => {
                          onLanguageChange(lang)
                          setShowLanguagePicker(false)
                        }}
                        style={[
                          styles.languageItem,
                          isSelected && styles.languageItemSelected,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={t(`languages.${lang}`, lang.toUpperCase())}
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text style={styles.languageFlag}>{langFlag}</Text>
                        <Text style={styles.languageName}>
                          {t(`languages.${lang}`, lang.toUpperCase())}
                        </Text>
                        {isSelected && (
                          <View style={styles.checkmark}>
                            <Text style={styles.checkmarkText}>✓</Text>
                          </View>
                        )}
                      </Pressable>
                    )
                  })}
                </View>
              </GlassView>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Single Glass Tooltip Below Container */}
      {tooltipText && (
        <GlassView style={styles.tooltip} intensity="high">
          <Text style={styles.tooltipText}>{tooltipText}</Text>
        </GlassView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  panelContainer: {
    height: isTV ? 56 : 48,
    position: 'relative',
  },
  glassBackground: {
    flex: 1,
    width: 'fit-content',
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(17, 17, 34, 0.95)',
    backdropFilter: 'blur(20px)',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 0,
    paddingRight: 0,
    justifyContent: 'flex-start',
    gap: spacing.xs,
  },
  languageSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  buttonHovered: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  languageSettingsText: {
    fontSize: isTV ? 15 : 13,
    fontWeight: '600',
    color: colors.text,
    whiteSpace: 'nowrap',
  },
  textActive: {
    color: colors.primary.DEFAULT,
  },
  premiumIcon: {
    marginLeft: spacing.xs / 2,
  },
  flagBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  flagText: {
    fontSize: 18,
  },
  expandedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.xs,
    paddingLeft: spacing.sm,
  },
  divider: {
    width: 1.5,
    height: 32,
    backgroundColor: 'rgba(139, 92, 246, 0.35)',
    marginRight: spacing.xs,
  },
  controlItem: {
    flexShrink: 0,
  },
  fullscreenButton: {
    width: isTV ? 56 : 44,
    height: isTV ? 56 : 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  languagePickerContainer: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: 500,
  },
  languagePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.3)',
  },
  languagePickerTitle: {
    fontSize: isTV ? 20 : 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  languageList: {
    gap: spacing.xs,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  languageItemSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  languageFlag: {
    fontSize: isTV ? 28 : 24,
  },
  languageName: {
    flex: 1,
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  tooltip: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: [{ translateX: '-50%' }],
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minWidth: 160,
    zIndex: 1000,
  },
  tooltipText: {
    color: colors.text,
    fontSize: isTV ? 14 : 12,
    fontWeight: '600',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
})

export default GlassLiveControlsPanel

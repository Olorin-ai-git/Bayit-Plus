/**
 * GlassLiveControlsPanel Component
 * Horizontal expandable glassmorphic panel for live channel controls
 * Contains Live Language Magic (premium), Live Translate, and Live Dubbing buttons
 */

import { useRef, useEffect, useState } from 'react'
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Languages, Maximize, Minimize, Sparkles } from 'lucide-react'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { isTV } from '@bayit/shared/utils/platform'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'

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
  isFullscreen: boolean
  onToggleFullscreen: () => void
  renderLiveSubtitleControls?: () => React.ReactNode
  renderDubbingControls?: () => React.ReactNode
}

export function GlassLiveControlsPanel({
  isExpanded,
  onToggleExpand,
  currentLanguage,
  isFullscreen,
  onToggleFullscreen,
  renderLiveSubtitleControls,
  renderDubbingControls,
}: GlassLiveControlsPanelProps) {
  const { t } = useTranslation()
  const [isHovered, setIsHovered] = useState(false)
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
    outputRange: [260, 580],
  })

  const contentOpacity = expandAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  })

  const flag = LANG_FLAGS[currentLanguage] || currentLanguage.toUpperCase()

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.panelContainer, { width: panelWidth }]}>
        {/* Glass background with single clean border */}
        <View style={styles.glassBackground}>
          <View style={styles.contentRow}>
            {/* Live Language Magic Toggle Button */}
            <Pressable
              onPress={onToggleExpand}
              onHoverIn={() => setIsHovered(true)}
              onHoverOut={() => setIsHovered(false)}
              style={[styles.languageSettingsButton, isHovered && styles.buttonHovered]}
              accessibilityRole="button"
              accessibilityLabel={t('player.liveLanguageMagic', 'Live Language Magic')}
              accessibilityState={{ expanded: isExpanded }}
            >
              <View style={styles.flagBadge}>
                <Text style={styles.flagText}>{flag}</Text>
              </View>
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

            {/* Expanded Controls */}
            {isExpanded && (
              <Animated.View style={[styles.expandedControls, { opacity: contentOpacity }]}>
                {/* Divider */}
                <View style={styles.divider} />

                {/* Live Translate */}
                {renderLiveSubtitleControls && (
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
    paddingRight: spacing.md,
  },
  languageSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
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
    gap: spacing.md,
    marginLeft: spacing.md,
    paddingLeft: spacing.md,
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
})

export default GlassLiveControlsPanel

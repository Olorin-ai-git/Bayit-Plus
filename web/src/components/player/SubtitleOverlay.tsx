/**
 * SubtitleOverlay Component
 * Renders subtitle cues over the video player with customizable styling
 */

import { useMemo } from 'react'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { SubtitleCue, SubtitleSettings, getLanguageInfo, SplitLanguages } from '@/types/subtitle'
import { useSafeAreaInsets } from '@bayit/shared-hooks/useSafeArea'
import SplitSubtitleOverlay from './subtitle/SplitSubtitleOverlay'
import { isShoreshJson } from '@/utils/shoreshHighlight'
import ShoreshText from './subtitle/ShoreshText'

interface SubtitleOverlayProps {
  currentTime: number
  subtitles: SubtitleCue[]
  language: string
  enabled: boolean
  settings: SubtitleSettings
  // Split mode props
  splitMode?: boolean
  splitLanguages?: SplitLanguages | null
  splitCues?: {
    primary: SubtitleCue[]
    secondary: SubtitleCue[]
  }
}

export default function SubtitleOverlay({
  currentTime,
  subtitles,
  language,
  enabled,
  settings,
  splitMode = false,
  splitLanguages = null,
  splitCues = { primary: [], secondary: [] },
}: SubtitleOverlayProps) {
  // Get safe area insets for dynamic positioning
  const safeAreaInsets = useSafeAreaInsets()

  // Calculate bottom position accounting for safe area
  const bottomPosition = useMemo(() => ({
    bottom: safeAreaInsets.bottom + 96, // Original padding + safe area
  }), [safeAreaInsets.bottom])

  // Find active subtitle cue(s) for current time
  // NOTE: This hook must be called before any early returns to follow Rules of Hooks
  const activeCues = useMemo(() => {
    if (!enabled || !subtitles.length) return []

    return subtitles.filter(
      (cue) => currentTime >= cue.start_time && currentTime <= cue.end_time
    )
  }, [currentTime, subtitles, enabled])

  // Render split mode overlay if active
  if (splitMode && splitLanguages && enabled) {
    return (
      <SplitSubtitleOverlay
        currentTime={currentTime}
        primaryCues={splitCues.primary}
        secondaryCues={splitCues.secondary}
        primaryLanguage={splitLanguages[0]}
        secondaryLanguage={splitLanguages[1]}
        enabled={enabled}
        settings={settings}
      />
    )
  }

  // Don't render if disabled or no active cues
  if (!enabled || activeCues.length === 0) {
    return null
  }

  // Get language info for RTL detection
  const languageInfo = getLanguageInfo(language)
  const isRTL = languageInfo?.rtl ?? false

  // Map font size setting to actual size
  const getFontSize = () => {
    switch (settings.fontSize) {
      case 'small':
        return 16
      case 'large':
        return 24
      case 'medium':
      default:
        return 20
    }
  }

  return (
    <View
      style={[
        styles.container,
        settings.position === 'top' ? styles.positionTop : bottomPosition,
      ]}
      pointerEvents="none"
    >
      {activeCues.map((cue) => {
        const isShoresh = isShoreshJson(cue.text)
        return (
          <View
            key={cue.index}
            style={[
              styles.cueContainer,
              {
                backgroundColor: settings.backgroundColor,
                opacity: settings.opacity ?? 1,
              }
            ]}
          >
            {isShoresh ? (
              <ShoreshText
                text={cue.text}
                color={settings.textColor}
                style={{
                  fontSize: getFontSize(),
                  fontFamily: settings.fontFamily,
                  textAlign: isRTL ? 'right' : 'center',
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                  lineHeight: 28,
                }}
              />
            ) : (
              <Text
                style={[
                  styles.cueText,
                  {
                    color: settings.textColor,
                    fontSize: getFontSize(),
                    fontFamily: settings.fontFamily,
                    textAlign: isRTL ? 'right' : 'center',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                  }
                ]}
              >
                {cue.text}
              </Text>
            )}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: '-50%' }],
    zIndex: 100,
    alignItems: 'center',
    maxWidth: '80%',
    overflow: 'hidden',
  },
  positionTop: {
    top: 32,
  },
  positionBottom: {
    bottom: 96,
  },
  cueContainer: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    alignSelf: 'center',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  cueText: {
    fontWeight: '600',
    lineHeight: 28,
    textAlign: 'center',
    ...Platform.select({
      web: { textShadow: '1px 1px 3px rgba(0, 0, 0, 0.95)' },
      default: {
        textShadowColor: 'rgba(0, 0, 0, 0.95)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
      },
    }),
  },
});

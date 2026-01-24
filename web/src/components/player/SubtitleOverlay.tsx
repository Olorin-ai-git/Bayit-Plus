/**
 * SubtitleOverlay Component
 * Renders subtitle cues over the video player with customizable styling
 */

import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { SubtitleCue, SubtitleSettings, getLanguageInfo } from '@/types/subtitle'

interface SubtitleOverlayProps {
  currentTime: number
  subtitles: SubtitleCue[]
  language: string
  enabled: boolean
  settings: SubtitleSettings
}

export default function SubtitleOverlay({
  currentTime,
  subtitles,
  language,
  enabled,
  settings,
}: SubtitleOverlayProps) {
  // Find active subtitle cue(s) for current time
  const activeCues = useMemo(() => {
    if (!enabled || !subtitles.length) return []

    return subtitles.filter(
      (cue) => currentTime >= cue.start_time && currentTime <= cue.end_time
    )
  }, [currentTime, subtitles, enabled])

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
        settings.position === 'top' ? styles.positionTop : styles.positionBottom,
      ]}
      pointerEvents="none"
    >
      {activeCues.map((cue) => (
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
        </View>
      ))}
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
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

/**
 * SubtitleOverlay Component
 * Renders subtitle cues over the video player with customizable styling
 */

import { useMemo } from 'react'
import { View, Text } from 'react-native'
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
      className={`absolute left-0 right-0 z-[100] items-center px-4 ${
        settings.position === 'top' ? 'top-8' : 'bottom-24'
      }`}
      pointerEvents="none"
    >
      {activeCues.map((cue) => (
        <View
          key={cue.index}
          className="py-1 px-4 rounded max-w-[90%] my-0.5"
          style={{
            backgroundColor: settings.backgroundColor,
            opacity: settings.opacity ?? 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 4,
          }}
        >
          <Text
            className="font-semibold leading-7 text-center"
            style={{
              color: settings.textColor,
              fontSize: getFontSize(),
              fontFamily: settings.fontFamily,
              textAlign: isRTL ? 'right' : 'center',
              writingDirection: isRTL ? 'rtl' : 'ltr',
              textShadowColor: 'rgba(0, 0, 0, 0.95)',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 3,
            }}
          >
            {cue.text}
          </Text>
        </View>
      ))}
    </View>
  )
}

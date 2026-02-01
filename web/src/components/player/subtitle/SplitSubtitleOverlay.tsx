/**
 * SplitSubtitleOverlay Component
 * Renders two subtitle panes side-by-side for split screen mode
 */

import { useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import { SubtitleCue, SubtitleSettings } from '@/types/subtitle'
import { useSafeAreaInsets } from '@bayit/shared-hooks/useSafeArea'
import { spacing } from '@olorin/design-tokens'
import SubtitlePane from './SubtitlePane'

interface SplitSubtitleOverlayProps {
  currentTime: number
  primaryCues: SubtitleCue[]
  secondaryCues: SubtitleCue[]
  primaryLanguage: string
  secondaryLanguage: string
  enabled: boolean
  settings: SubtitleSettings
}

export default function SplitSubtitleOverlay({
  currentTime,
  primaryCues,
  secondaryCues,
  primaryLanguage,
  secondaryLanguage,
  enabled,
  settings,
}: SplitSubtitleOverlayProps) {
  const safeAreaInsets = useSafeAreaInsets()

  // Calculate bottom position accounting for safe area
  const bottomPosition = useMemo(() => ({
    bottom: safeAreaInsets.bottom + 96,
  }), [safeAreaInsets.bottom])

  // Find active cues for primary language
  const activePrimaryCues = useMemo(() => {
    if (!primaryCues.length) return []
    return primaryCues.filter(
      (cue) => currentTime >= cue.start_time && currentTime <= cue.end_time
    )
  }, [currentTime, primaryCues])

  // Find active cues for secondary language
  const activeSecondaryCues = useMemo(() => {
    if (!secondaryCues.length) return []
    return secondaryCues.filter(
      (cue) => currentTime >= cue.start_time && currentTime <= cue.end_time
    )
  }, [currentTime, secondaryCues])

  // Map font size setting to actual size (slightly smaller for split view)
  const fontSize = useMemo(() => {
    switch (settings.fontSize) {
      case 'small':
        return 14
      case 'large':
        return 20
      case 'medium':
      default:
        return 17
    }
  }, [settings.fontSize])

  // Don't render if disabled or no active cues on either side
  if (!enabled || (activePrimaryCues.length === 0 && activeSecondaryCues.length === 0)) {
    return null
  }

  return (
    <View
      style={[
        styles.container,
        settings.position === 'top' ? styles.positionTop : bottomPosition,
      ]}
      pointerEvents="none"
    >
      <SubtitlePane
        cues={activePrimaryCues}
        language={primaryLanguage}
        position="left"
        settings={settings}
        fontSize={fontSize}
      />

      <View style={styles.divider} />

      <SubtitlePane
        cues={activeSecondaryCues}
        language={secondaryLanguage}
        position="right"
        settings={settings}
        fontSize={fontSize}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 100,
    gap: spacing.sm,
  },
  positionTop: {
    top: 32,
    alignItems: 'flex-start',
  },
  divider: {
    width: 2,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 1,
  },
})

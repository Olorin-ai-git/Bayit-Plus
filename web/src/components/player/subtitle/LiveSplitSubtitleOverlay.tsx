/**
 * LiveSplitSubtitleOverlay Component
 * Renders two live subtitle panes side-by-side for split screen mode
 */

import { useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import { LiveSubtitleCue } from '@/types/subtitle'
import { useSafeAreaInsets } from '@bayit/shared-hooks/useSafeArea'
import { spacing } from '@olorin/design-tokens'
import LiveSubtitlePane from './LiveSubtitlePane'

interface LiveSplitSubtitleOverlayProps {
  primaryCues: LiveSubtitleCue[]
  secondaryCues: LiveSubtitleCue[]
  primaryLanguage: string
  secondaryLanguage: string
  enabled: boolean
  position?: 'top' | 'bottom'
  fontSize?: 'small' | 'medium' | 'large'
}

export default function LiveSplitSubtitleOverlay({
  primaryCues,
  secondaryCues,
  primaryLanguage,
  secondaryLanguage,
  enabled,
  position = 'bottom',
  fontSize = 'medium',
}: LiveSplitSubtitleOverlayProps) {
  const safeAreaInsets = useSafeAreaInsets()

  // Calculate bottom position accounting for safe area
  const bottomPosition = useMemo(() => ({
    bottom: safeAreaInsets.bottom + 96,
  }), [safeAreaInsets.bottom])

  // Map font size setting to actual size (slightly smaller for split view)
  const fontSizeValue = useMemo(() => {
    switch (fontSize) {
      case 'small':
        return 14
      case 'large':
        return 20
      case 'medium':
      default:
        return 17
    }
  }, [fontSize])

  // Don't render if disabled or no cues on either side
  if (!enabled || (primaryCues.length === 0 && secondaryCues.length === 0)) {
    return null
  }

  return (
    <View
      style={[
        styles.container,
        position === 'top' ? styles.positionTop : bottomPosition,
      ]}
      pointerEvents="none"
    >
      <LiveSubtitlePane
        cues={primaryCues}
        language={primaryLanguage}
        position="left"
        fontSize={fontSizeValue}
      />

      <View style={styles.divider} />

      <LiveSubtitlePane
        cues={secondaryCues}
        language={secondaryLanguage}
        position="right"
        fontSize={fontSizeValue}
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

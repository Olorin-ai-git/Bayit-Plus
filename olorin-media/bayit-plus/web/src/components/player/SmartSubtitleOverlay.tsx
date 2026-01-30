/**
 * SmartSubtitleOverlay Component
 * Displays dual-line subtitles: Simplified Hebrew (top) + English translation (bottom)
 * Hebrew root letters (shoresh) are highlighted in gold
 */

import { View, Text, StyleSheet } from 'react-native'
import { ShoreshSentence } from './ShoreshHighlight'
import type { ShoreshHighlight } from '@/services/smartSubsService'

interface SmartSubtitleCueData {
  simplified_hebrew: string
  english: string
  shoresh_highlights: ShoreshHighlight[]
  timestamp: number
  displayUntil: number
}

interface SmartSubtitleOverlayProps {
  cues: SmartSubtitleCueData[]
  showShoresh: boolean
  shoreshHighlightColor: string
}

export default function SmartSubtitleOverlay({
  cues,
  showShoresh,
  shoreshHighlightColor,
}: SmartSubtitleOverlayProps) {
  if (cues.length === 0) {
    return null
  }

  const currentCue = cues[cues.length - 1]

  return (
    <View style={styles.container}>
      <View style={styles.cueContainer}>
        {/* Top line: Simplified Hebrew (RTL) */}
        <View style={styles.hebrewLine}>
          {showShoresh && currentCue.shoresh_highlights.length > 0 ? (
            <ShoreshSentence
              text={currentCue.simplified_hebrew}
              highlights={currentCue.shoresh_highlights}
              highlightColor={shoreshHighlightColor}
              fontSize={28}
            />
          ) : (
            <Text style={styles.hebrewText}>
              {currentCue.simplified_hebrew}
            </Text>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Bottom line: English translation (LTR) */}
        <View style={styles.englishLine}>
          <Text style={styles.englishText}>
            {currentCue.english}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 96,
    left: '50%',
    transform: [{ translateX: '-50%' }],
    alignItems: 'center',
    zIndex: 100,
    pointerEvents: 'none',
    maxWidth: '85%',
    overflow: 'hidden',
  },
  cueContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignSelf: 'center',
    maxWidth: '100%',
    overflow: 'hidden',
    backdropFilter: 'blur(12px)',
  },
  hebrewLine: {
    alignItems: 'center',
    marginBottom: 4,
  },
  hebrewText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 36,
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 6,
    width: '100%',
  },
  englishLine: {
    alignItems: 'center',
    marginTop: 2,
  },
  englishText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 30,
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
})

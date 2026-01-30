/**
 * NikudSubtitleOverlay Component
 * Displays single-line Hebrew subtitles with nikud (vocalization marks)
 * RTL text with larger font for diacritic readability
 * Glassmorphism background consistent with LiveSubtitleOverlay
 */

import { View, Text, StyleSheet } from 'react-native'

interface NikudCueData {
  text: string
  text_nikud: string
  timestamp: number
  displayUntil: number
}

interface NikudSubtitleOverlayProps {
  cues: NikudCueData[]
}

export default function NikudSubtitleOverlay({ cues }: NikudSubtitleOverlayProps) {
  if (cues.length === 0) {
    return null
  }

  const currentCue = cues[cues.length - 1]

  return (
    <View style={styles.container}>
      <View style={styles.cueContainer}>
        <Text
          style={styles.nikudText}
          accessibilityRole="text"
          accessibilityLabel={`Hebrew with nikud: ${currentCue.text_nikud}`}
        >
          {currentCue.text_nikud}
        </Text>
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
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignSelf: 'center',
    maxWidth: '100%',
    overflow: 'hidden',
    backdropFilter: 'blur(12px)',
  },
  nikudText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 42,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
})

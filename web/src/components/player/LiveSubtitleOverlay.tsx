/**
 * LiveSubtitleOverlay Component
 * Displays live subtitle cues with automatic expiration
 */

import { View, Text, StyleSheet } from 'react-native'
import { LiveSubtitleCue } from '@/services/liveSubtitleService'
import { isShoreshJson } from '@/utils/shoreshHighlight'
import ShoreshText from './subtitle/ShoreshText'

interface LiveSubtitleOverlayProps {
  cues: LiveSubtitleCue[]
}

export default function LiveSubtitleOverlay({ cues }: LiveSubtitleOverlayProps) {
  if (cues.length === 0) {
    return null
  }

  return (
    <View style={styles.container}>
      {cues.map((cue, idx) => {
        const isShoresh = isShoreshJson(cue.text)
        return (
          <View key={`${cue.timestamp}-${idx}`} style={styles.cueContainer}>
            {isShoresh ? (
              <ShoreshText text={cue.text} style={styles.cueText} />
            ) : (
              <Text style={styles.cueText}>
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
    bottom: 96, // 24 * 4 (bottom-24 in Tailwind)
    left: '50%',
    transform: [{ translateX: '-50%' }],
    alignItems: 'center',
    zIndex: 100,
    pointerEvents: 'none',
    maxWidth: '80%',
    overflow: 'hidden',
  },
  cueContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'center',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  cueText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 32,
    textShadow: '2px 2px 4px rgba(0, 0, 0, 1)',
  },
})

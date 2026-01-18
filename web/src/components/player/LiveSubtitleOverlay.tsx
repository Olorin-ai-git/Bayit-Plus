/**
 * LiveSubtitleOverlay Component
 * Displays live subtitle cues with automatic expiration
 */

import { View, Text, StyleSheet } from 'react-native'
import { colors, spacing } from '@bayit/shared/theme'
import { LiveSubtitleCue } from '@/services/liveSubtitleService'

interface LiveSubtitleOverlayProps {
  cues: LiveSubtitleCue[]
}

export default function LiveSubtitleOverlay({ cues }: LiveSubtitleOverlayProps) {
  if (cues.length === 0) return null

  return (
    <View style={styles.overlay}>
      {cues.map((cue, idx) => (
        <View key={`${cue.timestamp}-${idx}`} style={styles.cue}>
          <Text style={styles.text}>{cue.text}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: spacing.xxl * 2,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    zIndex: 100,
  },
  cue: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginVertical: spacing.xs,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    lineHeight: 32,
  },
})

/**
 * DubbingOverlay Component
 * Displays current transcript and translation during live dubbing
 */

import { View, Text, StyleSheet, Animated } from 'react-native'
import { useEffect, useRef } from 'react'
import { Volume2 } from 'lucide-react'

interface DubbingOverlayProps {
  isActive: boolean
  originalText: string
  translatedText: string
  latencyMs: number
  showTranscript?: boolean
}

export default function DubbingOverlay({
  isActive,
  originalText,
  translatedText,
  latencyMs,
  showTranscript = true,
}: DubbingOverlayProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (translatedText) {
      // Fade in when new text arrives
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        // Fade out after 4 seconds
        Animated.delay(4000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [translatedText, fadeAnim])

  if (!isActive || !translatedText) return null

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Active indicator */}
      <View style={styles.header}>
        <Volume2 size={14} color="#9333ea" />
        <Text style={styles.headerText}>Live Dubbing</Text>
        <View style={styles.latencyBadge}>
          <Text style={styles.latencyText}>{latencyMs}ms</Text>
        </View>
      </View>

      {/* Original text (optional, smaller) */}
      {showTranscript && originalText && (
        <View style={styles.originalContainer}>
          <Text style={styles.originalText} numberOfLines={2}>
            {originalText}
          </Text>
        </View>
      )}

      {/* Translated text (primary display) */}
      <View style={styles.translatedContainer}>
        <Text style={styles.translatedText}>{translatedText}</Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.4)',
    marginBottom: 8,
  },
  headerText: {
    color: '#c4b5fd',
    fontSize: 11,
    fontWeight: '600',
  },
  latencyBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  latencyText: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '500',
  },
  originalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 4,
    maxWidth: '90%',
  },
  originalText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  translatedContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    maxWidth: '95%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  translatedText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
})

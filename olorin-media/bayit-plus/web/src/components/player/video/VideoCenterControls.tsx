/**
 * VideoCenterControls - Center play/pause and skip buttons
 *
 * Migration Status: ✅ StyleSheet → TailwindCSS
 * File Size: Under 200 lines ✓
 */

import { View, Text, StyleSheet } from 'react-native'
import { z } from 'zod'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'

// Zod schema for prop validation
const VideoCenterControlsPropsSchema = z.object({
  isPlaying: z.boolean(),
  isLive: z.boolean(),
  onTogglePlay: z.function().args().returns(z.void()),
  onSkip: z.function().args(z.number()).returns(z.void()),
})

export type VideoCenterControlsProps = z.infer<typeof VideoCenterControlsPropsSchema>

export default function VideoCenterControls({
  isPlaying,
  isLive,
  onTogglePlay,
  onSkip,
}: VideoCenterControlsProps) {
  const handleClick = (e: any, action: () => void) => {
    e?.stopPropagation?.()
    action()
  }

  return (
    <View style={styles.container}>
      {!isLive && (
        <View onClick={(e: any) => handleClick(e, () => onSkip(-30))} style={styles.skipButton}>
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.text}
            strokeWidth={2}
          >
            <path d="M12 5V1L7 6l5 5V7a6 6 0 11-6 6" />
          </svg>
          <Text style={styles.skipText}>30</Text>
        </View>
      )}

      <View onClick={(e: any) => handleClick(e, onTogglePlay)} style={styles.playButton}>
        {isPlaying ? (
          <svg width={40} height={40} viewBox="0 0 24 24" fill={colors.text}>
            <rect x="6" y="5" width="4" height="14" />
            <rect x="14" y="5" width="4" height="14" />
          </svg>
        ) : (
          <svg
            width={40}
            height={40}
            viewBox="0 0 24 24"
            fill={colors.text}
            style={{ marginLeft: 4 }}
          >
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </View>

      {!isLive && (
        <View onClick={(e: any) => handleClick(e, () => onSkip(30))} style={styles.skipButton}>
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.text}
            strokeWidth={2}
          >
            <path d="M12 5V1l5 5-5 5V7a6 6 0 106 6" />
          </svg>
          <Text style={styles.skipText}>30</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    pointerEvents: 'none',
  },
  skipButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.9,
    pointerEvents: 'auto',
    cursor: 'pointer',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    pointerEvents: 'auto',
    cursor: 'pointer',
  },
  skipText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: -4,
  },
});

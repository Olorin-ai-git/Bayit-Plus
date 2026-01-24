/**
 * TimeDisplay Component
 * Current time / duration display with optional speed badge
 *
 * Features:
 * - Current time / total duration format
 * - Playback speed badge (when speed !== 1x)
 * - Tabular numbers for consistent width
 * - TailwindCSS styling
 */

import { View, Text, StyleSheet } from 'react-native'
import { z } from 'zod'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'

const TimeDisplayPropsSchema = z.object({
  currentTime: z.number(),
  duration: z.number(),
  playbackSpeed: z.number(),
  formatTime: z.function().args(z.number()).returns(z.string()),
})

type TimeDisplayProps = z.infer<typeof TimeDisplayPropsSchema>

export default function TimeDisplay({
  currentTime,
  duration,
  playbackSpeed,
  formatTime,
}: TimeDisplayProps) {
  const speedDisplay = playbackSpeed !== 1 ? `${playbackSpeed}x` : null

  return (
    <View style={styles.container}>
      <Text style={styles.timeText}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </Text>
      {speedDisplay && (
        <Text style={styles.speedBadge}>{speedDisplay}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  timeText: {
    fontSize: 14,
    color: '#a3a3a3',
    fontVariant: ['tabular-nums'],
  },
  speedBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a855f7',
    backgroundColor: 'rgba(126, 34, 206, 0.3)',
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
    borderRadius: borderRadius.DEFAULT,
  },
})

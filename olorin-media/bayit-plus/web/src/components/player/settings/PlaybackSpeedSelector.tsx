/**
 * PlaybackSpeedSelector Component
 * Playback speed control for non-live content
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'

// Validation schema
export const PlaybackSpeedSelectorPropsSchema = z.object({
  currentSpeed: z.number().default(1),
  onSpeedChange: z.function().args(z.number()).returns(z.void()),
  videoRef: z.custom<React.RefObject<HTMLVideoElement>>(),
})

export type PlaybackSpeedSelectorProps = z.infer<typeof PlaybackSpeedSelectorPropsSchema>

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

export default function PlaybackSpeedSelector({
  currentSpeed,
  onSpeedChange,
  videoRef,
}: PlaybackSpeedSelectorProps) {
  const { t } = useTranslation()

  const handleSpeedChange = (speed: number) => {
    // Try callback first, fallback to direct video ref manipulation
    if (onSpeedChange) {
      onSpeedChange(speed)
    } else if (videoRef.current) {
      videoRef.current.playbackRate = speed
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('player.playbackSpeed')}</Text>
      <View style={styles.speedList}>
        {PLAYBACK_SPEEDS.map((speed) => {
          const isActive = currentSpeed === speed

          return (
            <Pressable
              key={speed}
              style={[
                styles.speedButton,
                isActive ? styles.speedActive : styles.speedInactive,
              ]}
              onPress={() => handleSpeedChange(speed)}
            >
              <Text style={[styles.speedText, isActive ? styles.textActive : styles.textInactive]}>
                {speed}x
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[6],
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[2],
  },
  speedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  speedButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  speedActive: {
    borderColor: 'rgba(168, 85, 247, 0.5)',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  speedInactive: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  speedText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textActive: {
    color: '#c084fc',
    fontWeight: '600',
  },
  textInactive: {
    color: '#9ca3af',
  },
});

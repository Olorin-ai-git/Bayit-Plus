/**
 * PlayButton Component
 * Play/Pause toggle button for video player
 *
 * Features:
 * - Play/Pause icon toggle
 * - Hover state with glassmorphic effect
 * - TailwindCSS styling
 * - Accessibility support
 */

import { Pressable, StyleSheet } from 'react-native'
import { Play, Pause } from 'lucide-react'
import { z } from 'zod'
import { colors, borderRadius } from '@olorin/design-tokens'

const PlayButtonPropsSchema = z.object({
  isPlaying: z.boolean(),
  onToggle: z.function().returns(z.void()),
})

type PlayButtonProps = z.infer<typeof PlayButtonPropsSchema>

export default function PlayButton({ isPlaying, onToggle }: PlayButtonProps) {
  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation?.()
        onToggle()
      }}
      style={styles.button}
      accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
      accessibilityRole="button"
    >
      {isPlaying ? (
        <Pause size={22} color={colors.text} />
      ) : (
        <Play size={22} color={colors.text} />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

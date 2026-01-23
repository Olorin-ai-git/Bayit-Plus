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

import { Pressable } from 'react-native'
import { Play, Pause } from 'lucide-react'
import { z } from 'zod'
import { colors } from '@bayit/shared/theme'
import { platformClass } from '../../../utils/platformClass'

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
      className={platformClass(
        'w-9 h-9 rounded-lg items-center justify-center hover:bg-white/10',
        'w-9 h-9 rounded-lg items-center justify-center'
      )}
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

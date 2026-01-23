/**
 * VolumeControls Component
 * Volume control with mute toggle and slider
 *
 * Features:
 * - Mute/unmute toggle button
 * - Volume slider (0.0 - 1.0)
 * - TailwindCSS styling
 * - Web-only volume slider (HTML5 input)
 */

import { View, Pressable } from 'react-native'
import { Volume2, VolumeX } from 'lucide-react'
import { z } from 'zod'
import { colors } from '@bayit/shared/theme'
import { platformClass } from '../../../utils/platformClass'

const VolumeControlsPropsSchema = z.object({
  isMuted: z.boolean(),
  volume: z.number().min(0).max(1),
  onToggleMute: z.function().returns(z.void()),
  onVolumeChange: z.function()
    .args(z.any())
    .returns(z.void()),
})

type VolumeControlsProps = z.infer<typeof VolumeControlsPropsSchema>

export default function VolumeControls({
  isMuted,
  volume,
  onToggleMute,
  onVolumeChange,
}: VolumeControlsProps) {
  return (
    <View className="flex-row items-center gap-1">
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.()
          onToggleMute()
        }}
        className={platformClass(
          'w-9 h-9 rounded-lg items-center justify-center hover:bg-white/10',
          'w-9 h-9 rounded-lg items-center justify-center'
        )}
        accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}
        accessibilityRole="button"
      >
        {isMuted ? (
          <VolumeX size={18} color={colors.text} />
        ) : (
          <Volume2 size={18} color={colors.text} />
        )}
      </Pressable>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={isMuted ? 0 : volume}
        onChange={onVolumeChange}
        onClick={(e) => e.stopPropagation()}
        className="w-20"
        style={{
          accentColor: colors.primary,
        }}
        aria-label="Volume"
      />
    </View>
  )
}

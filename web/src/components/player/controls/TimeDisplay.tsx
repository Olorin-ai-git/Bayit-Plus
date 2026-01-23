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

import { View, Text } from 'react-native'
import { z } from 'zod'
import { platformClass } from '../../../utils/platformClass'

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
    <View className="flex-row items-center gap-2">
      <Text
        className={platformClass(
          'text-sm text-neutral-400',
          'text-sm text-neutral-400'
        )}
        style={{
          fontVariant: ['tabular-nums'] as any,
        }}
      >
        {formatTime(currentTime)} / {formatTime(duration)}
      </Text>
      {speedDisplay && (
        <Text
          className={platformClass(
            'text-[11px] font-semibold text-purple-500 bg-purple-700/30 px-1 py-0.5 rounded',
            'text-[11px] font-semibold text-purple-500 bg-purple-700/30 px-1 py-0.5 rounded'
          )}
        >
          {speedDisplay}
        </Text>
      )}
    </View>
  )
}

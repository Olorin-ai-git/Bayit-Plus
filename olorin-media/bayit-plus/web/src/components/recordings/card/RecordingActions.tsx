/**
 * RecordingActions Component
 * Play and delete action buttons for recordings
 */

import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { Play, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { platformClass } from '@/utils/platformClass'

/**
 * Zod schema for RecordingActions props
 */
const RecordingActionsPropsSchema = z.object({
  onPlay: z.function().args().returns(z.void()),
  onDelete: z.function().args().returns(z.void()),
  playLabel: z.string(),
})

type RecordingActionsProps = z.infer<typeof RecordingActionsPropsSchema>

/**
 * RecordingActions - Play and delete buttons
 */
export const RecordingActions: React.FC<RecordingActionsProps> = ({
  onPlay,
  onDelete,
  playLabel,
}) => {
  return (
    <View className={platformClass(
      'flex-row gap-2 mt-4',
      'flex-row gap-2 mt-4'
    )}>
      {/* Play button */}
      <Pressable
        onPress={onPlay}
        className={platformClass(
          'flex-1 bg-purple-500 flex-row items-center justify-center gap-1 py-4 rounded-lg hover:bg-purple-600 active:bg-purple-700',
          'flex-1 bg-purple-500 flex-row items-center justify-center gap-1 py-4 rounded-lg'
        )}
      >
        <Play size={16} color="white" fill="white" />
        <Text className={platformClass(
          'text-white text-sm font-semibold',
          'text-white text-sm font-semibold'
        )}>
          {playLabel}
        </Text>
      </Pressable>

      {/* Delete button */}
      <Pressable
        onPress={onDelete}
        className={platformClass(
          'bg-red-500/20 px-6 py-4 rounded-lg justify-center items-center hover:bg-red-500/30 active:bg-red-500/40',
          'bg-red-500/20 px-6 py-4 rounded-lg justify-center items-center'
        )}
      >
        <Trash2 size={16} color="#ef4444" />
      </Pressable>
    </View>
  )
}

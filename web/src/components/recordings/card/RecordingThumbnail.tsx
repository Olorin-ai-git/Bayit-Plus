/**
 * RecordingThumbnail Component
 * Displays recording thumbnail or placeholder with duration badge
 */

import React from 'react'
import { View, Text, Image, Pressable } from 'react-native'
import { z } from 'zod'
import { platformClass } from '@/utils/platformClass'
import { NativeIcon } from '@olorin/shared-icons/native'
import { colors } from '@olorin/design-tokens'

/**
 * Zod schema for RecordingThumbnail props
 */
const RecordingThumbnailPropsSchema = z.object({
  thumbnail: z.string().optional(),
  duration: z.string(),
  onPress: z.function().args().returns(z.void()),
})

type RecordingThumbnailProps = z.infer<typeof RecordingThumbnailPropsSchema>

/**
 * RecordingThumbnail - Displays recording thumbnail with duration badge
 */
export const RecordingThumbnail: React.FC<RecordingThumbnailProps> = ({
  thumbnail,
  duration,
  onPress,
}) => {
  return (
    <Pressable onPress={onPress} className={platformClass('relative', 'relative')}>
      {thumbnail ? (
        <Image
          source={{ uri: thumbnail }}
          className={platformClass('w-full h-[200px]', 'w-full h-[200px]')}
          resizeMode="cover"
        />
      ) : (
        <View className={platformClass(
          'w-full h-[200px] bg-neutral-800 justify-center items-center',
          'w-full h-[200px] bg-neutral-800 justify-center items-center'
        )}>
          <NativeIcon name="vod" size="xl" color={colors.textMuted} />
        </View>
      )}
      <View className={platformClass(
        'absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded',
        'absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded'
      )}>
        <Text className={platformClass(
          'text-white text-xs font-semibold',
          'text-white text-xs font-semibold'
        )}>
          {duration}
        </Text>
      </View>
    </Pressable>
  )
}

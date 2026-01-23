/**
 * RecordingMetadata Component
 * Displays recording metadata (date, file size, expiry, subtitles)
 */

import React from 'react'
import { View, Text } from 'react-native'
import { Calendar, HardDrive } from 'lucide-react'
import { z } from 'zod'
import { platformClass } from '@/utils/platformClass'

/**
 * Zod schema for RecordingMetadata props
 */
const RecordingMetadataPropsSchema = z.object({
  recordedDate: z.string(),
  fileSize: z.string(),
  expiryDate: z.string(),
  hasSubtitles: z.boolean(),
  expiresLabel: z.string(),
  subtitlesLabel: z.string().optional(),
})

type RecordingMetadataProps = z.infer<typeof RecordingMetadataPropsSchema>

/**
 * RecordingMetadata - Displays recording date, file size, expiry info, and subtitle badge
 */
export const RecordingMetadata: React.FC<RecordingMetadataProps> = ({
  recordedDate,
  fileSize,
  expiryDate,
  hasSubtitles,
  expiresLabel,
  subtitlesLabel,
}) => {
  return (
    <>
      {/* Recorded date */}
      <View className={platformClass(
        'flex-row items-center gap-1 mb-1',
        'flex-row items-center gap-1 mb-1'
      )}>
        <Calendar size={14} color="#a3a3a3" />
        <Text className={platformClass(
          'text-xs text-neutral-400',
          'text-xs text-neutral-400'
        )}>
          {recordedDate}
        </Text>
      </View>

      {/* File size and expiry */}
      <View className={platformClass(
        'flex-row items-center gap-1 mb-1',
        'flex-row items-center gap-1 mb-1'
      )}>
        <HardDrive size={14} color="#a3a3a3" />
        <Text className={platformClass(
          'text-xs text-neutral-400',
          'text-xs text-neutral-400'
        )}>
          {fileSize}
        </Text>
        <Text className={platformClass(
          'text-xs text-neutral-400 mx-1',
          'text-xs text-neutral-400 mx-1'
        )}>
          •
        </Text>
        <Text className={platformClass(
          'text-xs text-neutral-400',
          'text-xs text-neutral-400'
        )}>
          {expiresLabel} {expiryDate}
        </Text>
      </View>

      {/* Subtitles badge */}
      {hasSubtitles && subtitlesLabel && (
        <View className={platformClass(
          'bg-purple-500/20 px-2 py-1 rounded self-start mt-2 mb-4',
          'bg-purple-500/20 px-2 py-1 rounded self-start mt-2 mb-4'
        )}>
          <Text className={platformClass(
            'text-purple-500 text-xs font-semibold',
            'text-purple-500 text-xs font-semibold'
          )}>
            {subtitlesLabel}
          </Text>
        </View>
      )}
    </>
  )
}

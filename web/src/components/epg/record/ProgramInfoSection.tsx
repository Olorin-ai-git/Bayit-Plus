/**
 * Program information section for EPG recording modal
 * Displays program title, channel, time, and duration
 * @module epg/record/ProgramInfoSection
 */

import React from 'react'
import { View, Text } from 'react-native'
import { Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DateTime } from 'luxon'
import { z } from 'zod'
import { platformClass } from '@/utils/platformClass'
import { useDirection } from '@/hooks/useDirection'
import { EPGProgram } from '@/services/epgApi'

/**
 * Props schema
 */
const ProgramInfoSectionPropsSchema = z.object({
  program: z.custom<EPGProgram>(),
  channelName: z.string().min(1),
})

type ProgramInfoSectionProps = z.infer<typeof ProgramInfoSectionPropsSchema>

/**
 * Format duration in seconds to human-readable format
 */
function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)

  if (hrs > 0) {
    return `${hrs}h ${mins}m`
  }
  return `${mins}m`
}

/**
 * Program information section component
 */
const ProgramInfoSection: React.FC<ProgramInfoSectionProps> = ({
  program,
  channelName,
}) => {
  const { t } = useTranslation()
  const { flexDirection, textAlign } = useDirection()

  const startTime = DateTime.fromISO(program.start_time)
  const endTime = DateTime.fromISO(program.end_time)
  const durationFormatted = formatDuration(program.duration_seconds)

  return (
    <View className={platformClass('mb-6')}>
      {/* Program Title */}
      <Text
        className={platformClass('text-lg font-semibold text-white mb-2')}
        style={{ textAlign }}
      >
        {program.title}
      </Text>

      {/* Channel Name */}
      <View
        className={platformClass('flex items-center gap-2 mb-1')}
        style={{ flexDirection }}
      >
        <Text className={platformClass('text-sm font-medium text-white/60')}>
          {t('epg.channel')}:
        </Text>
        <Text className={platformClass('text-sm text-white/80')}>
          {channelName}
        </Text>
      </View>

      {/* Time and Duration */}
      <View
        className={platformClass('flex items-center gap-3')}
        style={{ flexDirection }}
      >
        <Clock size={14} color="rgba(255, 255, 255, 0.6)" />
        <Text className={platformClass('text-sm text-white/60')}>
          {startTime.toFormat('HH:mm')} - {endTime.toFormat('HH:mm')}
        </Text>
        <Text className={platformClass('text-sm text-white/60 opacity-50')}>
          •
        </Text>
        <Text className={platformClass('text-sm text-white/60')}>
          {durationFormatted}
        </Text>
      </View>
    </View>
  )
}

export default ProgramInfoSection
